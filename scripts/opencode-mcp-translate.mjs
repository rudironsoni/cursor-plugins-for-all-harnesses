const ENV_VAR = /\$\{([^}]+)\}/g;

export function expandEnv(value) {
  return String(value).replace(ENV_VAR, (_, name) => process.env[name] ?? "");
}

export function translateServer(server) {
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
