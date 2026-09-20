import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));
const ENV_VAR = /\$\{([^}]+)\}/g;

function expandEnv(value) {
  return String(value).replace(ENV_VAR, (_, name) => process.env[name] ?? "");
}

function translateServer(server) {
  const isLocal = Boolean(server.command) || server.type === "stdio";
  if (isLocal) {
    const cmd = [server.command, ...(server.args || [])]
      .filter(Boolean)
      .map((part) => expandEnv(part));
    const out = { type: "local", command: cmd, enabled: true };
    if (server.env) {
      out.environment = Object.fromEntries(
        Object.entries(server.env).map(([key, val]) => [key, expandEnv(val)])
      );
    }
    if (server.cwd) out.cwd = server.cwd;
    return out;
  }

  const out = { type: "remote", enabled: true };
  if (server.url) out.url = expandEnv(server.url);
  if (server.headers) {
    out.headers = Object.fromEntries(
      Object.entries(server.headers).map(([key, val]) => [key, expandEnv(val)])
    );
  }
  if (server.auth) {
    const oauth = {};
    const clientId = server.auth.CLIENT_ID || server.auth.clientId;
    if (clientId) oauth.clientId = expandEnv(clientId);
    const scopes = server.auth.scopes || server.auth.scope;
    if (Array.isArray(scopes)) oauth.scope = scopes.join(" ");
    else if (typeof scopes === "string") oauth.scope = scopes;
    if (Object.keys(oauth).length) out.oauth = oauth;
  }
  return out;
}

export default async function opencodePlugin() {
  return {
    config: async (config) => {
      const skillsDir = join(PLUGIN_DIR, "skills");
      if (existsSync(skillsDir)) {
        const entries = await readdir(skillsDir, { withFileTypes: true });
        config.permission ??= {};
        config.permission.skill ??= {};
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            config.permission.skill[entry.name] = "allow";
          }
        }
      }

      const mcpPath = join(PLUGIN_DIR, "mcp.json");
      if (existsSync(mcpPath)) {
        const mcp = JSON.parse(await readFile(mcpPath, "utf8"));
        config.mcp ??= {};
        for (const [name, server] of Object.entries(mcp.mcpServers || {})) {
          config.mcp[name] = translateServer(server);
        }
      }

      const agentsDir = join(PLUGIN_DIR, "agents");
      if (existsSync(agentsDir)) {
        config.agent ??= {};
        for (const file of await readdir(agentsDir)) {
          if (!file.endsWith(".md")) continue;
          const name = file.replace(/\.md$/, "");
          const prompt = await readFile(join(agentsDir, file), "utf8");
          config.agent[name] = {
            description: name,
            mode: "subagent",
            prompt,
            permission: { edit: "deny", bash: "ask" },
          };
        }
      }

      const rulesDir = join(PLUGIN_DIR, "rules");
      if (existsSync(rulesDir)) {
        config.instructions ??= [];
        for (const file of await readdir(rulesDir)) {
          if (file.endsWith(".mdc") || file.endsWith(".md")) {
            config.instructions.push(join(rulesDir, file));
          }
        }
      }
    },
  };
}
