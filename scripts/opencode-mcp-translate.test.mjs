import assert from "node:assert/strict";
import { translateServer } from "./opencode-mcp-translate.mjs";

const previous = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
process.env.GITHUB_PERSONAL_ACCESS_TOKEN = "test-token";

try {
  const remote = translateServer({
    type: "http",
    url: "https://api.githubcopilot.com/mcp/",
    headers: {
      Authorization: "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}",
    },
  });
  assert.equal(remote.type, "remote");
  assert.equal(remote.url, "https://api.githubcopilot.com/mcp/");
  assert.equal(remote.headers.Authorization, "Bearer test-token");
  assert.equal(remote.oauth, undefined);

  const oauth = translateServer({
    type: "http",
    url: "https://mcp.docusign.com/mcp",
    auth: {
      CLIENT_ID: "${CLIENT_ID}",
      CLIENT_SECRET: "${CLIENT_SECRET}",
      scopes: ["signature"],
    },
  });
  assert.equal(oauth.oauth.clientId, process.env.CLIENT_ID ?? "");
  assert.equal(oauth.oauth.clientSecret, undefined);
  assert.equal(oauth.oauth.scope, "signature");

  const local = translateServer({
    command: "npx",
    args: ["-y", "@playwright/mcp"],
  });
  assert.deepEqual(local.command, ["npx", "-y", "@playwright/mcp"]);
  assert.equal(local.type, "local");
} finally {
  if (previous === undefined) delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  else process.env.GITHUB_PERSONAL_ACCESS_TOKEN = previous;
}

console.log("opencode-mcp-translate tests passed");
