#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const MARKETPLACE_NAME = "cursor-plugins";
const MARKETPLACE_OWNER = { name: "Rudimar Ronsoni" };
const MARKETPLACE_REPO =
  "https://github.com/rudironsoni/cursor-plugins-for-all-harnesses.git";
const DESCRIPTION =
  "Cursor plugins packaged for Claude Code, Grok Build, Codex, ChatGPT, and OpenCode.";

const OPENAI_CATEGORIES = new Set([
  "Productivity",
  "Creativity",
  "Developer Tools",
  "Business & Operations",
  "Data & Analytics",
  "Communication",
  "Education & Research",
  "Security",
  "Finance",
  "Healthcare",
  "Travel",
  "Entertainment",
  "Other",
]);

const CHATGPT_APPS = {
  github: {
    github: {
      id: "connector_76869538009648d5b282a4bb21c3d157",
      required: false,
    },
    "github-enterprise": {
      id: "templated_apps_GitHubEnterprise",
      required: false,
    },
  },
  gmail: {
    gmail: { id: "connector_2128aebfecb84f64a069897515042a44", required: true },
  },
  "google-drive": {
    "google-drive": {
      id: "connector_5f3c8c41a1e54ad7a76272c89e2554fa",
      required: true,
    },
  },
  "google-calendar": {
    "google-calendar": {
      id: "connector_947e0d954944416db111db556030eea6",
      required: true,
    },
  },
  teams: {
    teams: { id: "connector_246af0940da3457da0e751171dc1ce60", required: true },
  },
  sharepoint: {
    sharepoint: {
      id: "connector_1e4f6a44acf14e3ca1d96672f8c945bc",
      required: false,
    },
  },
  outlook: {
    "outlook-email": {
      id: "connector_4aaab2856305417b993eca9a216aaf6e",
      required: true,
    },
  },
  "outlook-calendar": {
    "outlook-calendar": {
      id: "connector_e6a7394682e24467ac68c60696f275a4",
      required: true,
    },
  },
  zoom: {
    zoom: { id: "asdk_app_69373a13116c819189d046aea1278836", required: true },
  },
};

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toRelativeSource(source) {
  return source.startsWith("./") ? source : `./${source}`;
}

function firstSentence(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return (match ? match[0] : trimmed).trim();
}

function clip(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd();
}

function openaiCategory(category) {
  switch (category) {
    case "developer-tools":
      return "Developer Tools";
    case "utilities":
    case "productivity":
    case "integrations":
      return "Productivity";
    default:
      return OPENAI_CATEGORIES.has(category) ? category : "Other";
  }
}

function grokCategory(category) {
  switch (category) {
    case "utilities":
    case "productivity":
      return "productivity";
    default:
      return "development";
  }
}

function pickAuthor(plugin) {
  if (!plugin.author?.name) return undefined;
  const author = { name: plugin.author.name };
  if (plugin.author.email) author.email = plugin.author.email;
  return author;
}

function detectComponents(pluginDir, cursorPlugin) {
  return {
    skills: Boolean(cursorPlugin.skills) || existsSync(join(pluginDir, "skills")),
    agents: Boolean(cursorPlugin.agents) || existsSync(join(pluginDir, "agents")),
    hooks:
      Boolean(cursorPlugin.hooks) ||
      existsSync(join(pluginDir, "hooks/hooks.json")),
    rules: Boolean(cursorPlugin.rules) || existsSync(join(pluginDir, "rules")),
    mcp:
      Boolean(cursorPlugin.mcpServers) ||
      existsSync(join(pluginDir, "mcp.json")),
  };
}

function mcpAuthKind(server) {
  if (server.auth || server.oauth) return "oauth";
  if (server.headers) return "bearer";
  return "none";
}

function collectEntries() {
  const marketplace = loadJSON(join(root, ".cursor-plugin/marketplace.json"));
  return (marketplace.plugins ?? []).map((entry) => {
    const pluginDir = resolve(root, entry.source);
    const pluginJsonPath = join(pluginDir, ".cursor-plugin/plugin.json");
    if (!existsSync(pluginJsonPath)) {
      throw new Error(`Missing ${relative(root, pluginJsonPath)}`);
    }
    const plugin = loadJSON(pluginJsonPath);
    const mcpPath = join(pluginDir, "mcp.json");
    const mcp = existsSync(mcpPath) ? loadJSON(mcpPath) : null;
    return {
      name: entry.name,
      source: entry.source,
      description: entry.description ?? plugin.description ?? "",
      pluginDir,
      plugin,
      components: detectComponents(pluginDir, plugin),
      mcp,
    };
  });
}

function buildCodexInterface(entry) {
  const displayName = entry.plugin.displayName || entry.name;
  const longDescription = entry.plugin.description || entry.description;
  const shortDescription = clip(firstSentence(longDescription), 240);
  const iface = {
    displayName,
    shortDescription,
    longDescription,
    developerName: entry.plugin.author?.name || "Cursor",
    category: openaiCategory(entry.plugin.category),
    capabilities: entry.components.mcp
      ? ["Interactive", "Read", "Write"]
      : ["Read"],
    defaultPrompt: [
      clip(`Use ${displayName}.`, 128),
    ],
  };
  iface.websiteURL = `${MARKETPLACE_REPO.replace(/\.git$/, "")}/tree/main/${entry.source}`;
  if (entry.plugin.logo) {
    const logo = `./${String(entry.plugin.logo).replace(/^\.\//, "")}`;
    if (/\.(png|jpe?g|webp)$/i.test(logo)) {
      iface.logo = logo;
      iface.composerIcon = logo;
    }
  }
  return iface;
}

function buildCodexPlugin(entry) {
  const manifest = {
    name: entry.name,
    version: entry.plugin.version ?? "1.0.0",
    description: entry.plugin.description || entry.description,
  };
  const author = pickAuthor(entry.plugin);
  if (author) manifest.author = author;
  manifest.homepage = `${MARKETPLACE_REPO.replace(/\.git$/, "")}/tree/main/${entry.source}`;
  manifest.repository = MARKETPLACE_REPO.replace(/\.git$/, "");
  if (entry.plugin.license) manifest.license = entry.plugin.license;
  if (entry.plugin.keywords?.length) manifest.keywords = entry.plugin.keywords;
  if (entry.components.skills) manifest.skills = "./skills/";
  if (CHATGPT_APPS[entry.name]) manifest.apps = "./.app.json";
  manifest.interface = buildCodexInterface(entry);
  return manifest;
}

function buildClaudePlugin(entry) {
  const manifest = {
    name: entry.name,
    version: entry.plugin.version ?? "1.0.0",
    description: entry.plugin.description || entry.description,
  };
  const author = pickAuthor(entry.plugin);
  if (author) manifest.author = author;
  if (entry.plugin.displayName) manifest.displayName = entry.plugin.displayName;
  if (entry.components.skills) manifest.skills = "./skills/";
  if (entry.components.agents) manifest.agents = "./agents/";
  if (entry.components.hooks) manifest.hooks = "./hooks/hooks.json";
  if (entry.components.mcp) manifest.mcpServers = "./mcp.json";
  return manifest;
}

function buildGrokPlugin(entry) {
  const manifest = {
    name: entry.name,
    version: entry.plugin.version ?? "1.0.0",
    description: entry.plugin.description || entry.description,
  };
  const author = pickAuthor(entry.plugin);
  if (author) manifest.author = author;
  if (entry.components.skills) manifest.skills = "./skills/";
  if (entry.components.agents) manifest.agents = "./agents/";
  if (entry.components.mcp) manifest.mcpServers = "./.mcp.json";
  return manifest;
}

function buildClaudeMarketplace(entries) {
  return {
    name: MARKETPLACE_NAME,
    description: DESCRIPTION,
    owner: MARKETPLACE_OWNER,
    plugins: entries.map((entry) => {
      const plugin = {
        name: entry.name,
        source: toRelativeSource(entry.source),
        strict: false,
        description: entry.description,
      };
      if (entry.components.mcp) plugin.mcpServers = "./mcp.json";
      return plugin;
    }),
  };
}

function buildGrokMarketplace(entries) {
  return {
    name: MARKETPLACE_NAME,
    description: DESCRIPTION,
    owner: MARKETPLACE_OWNER,
    plugins: entries.map((entry) => ({
      name: entry.name,
      description: entry.description,
      category: grokCategory(entry.plugin.category),
      source: {
        type: "local",
        path: toRelativeSource(entry.source),
      },
    })),
  };
}

function buildCodexMarketplace(entries) {
  return {
    name: MARKETPLACE_NAME,
    interface: { displayName: "Cursor plugins" },
    plugins: entries.map((entry) => ({
      name: entry.name,
      source: {
        source: "local",
        path: toRelativeSource(entry.source),
      },
      policy: {
        installation: "AVAILABLE",
        authentication: entry.components.mcp ? "ON_INSTALL" : "ON_FIRST_USE",
      },
      category: openaiCategory(entry.plugin.category),
    })),
  };
}

function httpsMcpList(entries) {
  const plugins = [];
  for (const entry of entries) {
    if (!entry.mcp?.mcpServers) continue;
    for (const [serverName, server] of Object.entries(entry.mcp.mcpServers)) {
      const url = server.url;
      if (!url || typeof url !== "string" || !url.startsWith("https://")) {
        continue;
      }
      plugins.push({
        plugin: entry.name,
        server: serverName,
        url,
        auth: mcpAuthKind(server),
        chatgptApp: Boolean(CHATGPT_APPS[entry.name]),
      });
    }
  }
  return { plugins };
}

function plannedFiles(entries) {
  const opencodeTemplate = readFileSync(
    join(__dirname, "opencode-plugin.template.js"),
    "utf8"
  );
  const files = new Map();
  files.set(
    join(root, ".claude-plugin/marketplace.json"),
    stableStringify(buildClaudeMarketplace(entries))
  );
  files.set(
    join(root, ".grok-plugin/marketplace.json"),
    stableStringify(buildGrokMarketplace(entries))
  );
  files.set(
    join(root, ".agents/plugins/marketplace.json"),
    stableStringify(buildCodexMarketplace(entries))
  );
  files.set(
    join(root, "scripts/chatgpt-https-mcps.json"),
    stableStringify(httpsMcpList(entries))
  );

  for (const entry of entries) {
    files.set(
      join(entry.pluginDir, ".claude-plugin/plugin.json"),
      stableStringify(buildClaudePlugin(entry))
    );
    files.set(
      join(entry.pluginDir, ".grok-plugin/plugin.json"),
      stableStringify(buildGrokPlugin(entry))
    );
    files.set(
      join(entry.pluginDir, ".codex-plugin/plugin.json"),
      stableStringify(buildCodexPlugin(entry))
    );
    files.set(join(entry.pluginDir, "opencode.js"), opencodeTemplate);

    if (entry.mcp) {
      files.set(
        join(entry.pluginDir, ".mcp.json"),
        `${JSON.stringify(entry.mcp, null, 2)}\n`
      );
    }

    const apps = CHATGPT_APPS[entry.name];
    if (apps) {
      files.set(join(entry.pluginDir, ".app.json"), stableStringify({ apps }));
    }
  }
  return files;
}

function writeFiles(files) {
  for (const [path, content] of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

function checkFiles(files) {
  const mismatches = [];
  for (const [path, expected] of files) {
    const rel = relative(root, path);
    if (!existsSync(path)) {
      mismatches.push(`${rel}: missing`);
      continue;
    }
    const actual = readFileSync(path, "utf8");
    if (actual !== expected) mismatches.push(`${rel}: stale`);
  }
  return mismatches;
}

const check = process.argv.includes("--check");
const entries = collectEntries();
const files = plannedFiles(entries);

if (check) {
  const mismatches = checkFiles(files);
  if (mismatches.length) {
    console.error("Harness packaging is out of date:");
    for (const line of mismatches) console.error(`  ${line}`);
    console.error("\nCI regenerates this after an upstream rebase.");
    console.error("Locally: node scripts/emit-harness-packaging.mjs");
    process.exit(1);
  }
  console.log(
    `Harness packaging is up to date (${files.size} files, ${entries.length} plugins).`
  );
  process.exit(0);
}

writeFiles(files);
console.log(
  `Wrote ${files.size} harness files for ${entries.length} plugins (${Object.keys(CHATGPT_APPS).length} ChatGPT apps).`
);
