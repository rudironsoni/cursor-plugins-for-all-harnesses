#!/usr/bin/env node

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  toRelativeSource,
  grokCategory,
  claudeCategory,
  codexCategory,
  detectComponents,
  buildClaudePluginManifest,
  buildGrokPluginManifest,
  buildCodexPluginManifest,
  buildClaudeMarketplace,
  buildGrokMarketplace,
  buildCodexMarketplace,
  generateHarnessMarketplaces,
} from "./generate-harness-marketplaces.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok   ${message}`);
  }
}

assert(toRelativeSource("teaching") === "./teaching", "prefixes relative sources");
assert(toRelativeSource("./teaching") === "./teaching", "keeps already-relative sources");
assert(grokCategory("developer-tools") === "development", "maps grok developer-tools");
assert(grokCategory("productivity") === "productivity", "maps grok productivity");
assert(claudeCategory("integrations") === "productivity", "maps claude integrations");
assert(codexCategory("developer-tools") === "Developer Tools", "maps codex developer-tools");

const skillPlugin = {
  name: "teaching",
  displayName: "Teaching",
  version: "1.0.0",
  description: "Learn things.",
  author: { name: "Cursor", email: "plugins@cursor.com" },
  homepage: "https://example.com",
  repository: "https://github.com/cursor/plugins",
  license: "MIT",
  logo: "assets/avatar.png",
  keywords: ["teaching"],
  category: "utilities",
  skills: "./skills/",
};

const mcpPlugin = {
  name: "gmail",
  displayName: "Gmail",
  version: "1.0.0",
  description: "Read mail.",
  author: { name: "Cursor" },
  category: "productivity",
  keywords: ["gmail", "mcp"],
  mcpServers: "./mcp.json",
};

const skillComponents = { skills: true, agents: false, hooks: true, rules: true, mcp: false };
const mcpComponents = { skills: false, agents: false, hooks: false, rules: false, mcp: true };

const claudeSkill = buildClaudePluginManifest(skillPlugin, skillComponents);
assert(claudeSkill.skills === "./skills/", "claude skill plugin declares skills");
assert(!("hooks" in claudeSkill), "claude manifest omits Cursor-only hooks");
assert(!("rules" in claudeSkill), "claude manifest omits Cursor-only rules");

const grokMcp = buildGrokPluginManifest(mcpPlugin, mcpComponents);
assert(grokMcp.mcpServers === "./.mcp.json", "grok MCP plugin points at .mcp.json");
assert(!("minClientVersions" in grokMcp), "grok manifest drops Cursor client constraints");

const codexSkill = buildCodexPluginManifest(skillPlugin, skillComponents);
assert(codexSkill.interface.category === "Utilities", "codex interface category");
assert(codexSkill.interface.logo === "./assets/avatar.png", "codex logo is relative");
assert(!("agents" in codexSkill), "codex manifest omits agents");

const entries = [
  {
    name: "teaching",
    source: "teaching",
    description: "Learn things.",
    plugin: skillPlugin,
    components: skillComponents,
  },
  {
    name: "gmail",
    source: "third_party/gmail",
    description: "Read mail.",
    plugin: mcpPlugin,
    components: mcpComponents,
  },
];

const claudeMarket = buildClaudeMarketplace(entries);
assert(claudeMarket.plugins[0].source === "./teaching", "claude marketplace uses ./ sources");
assert(claudeMarket.plugins[1].mcpServers === "./.mcp.json", "claude marketplace wires MCP");

const grokMarket = buildGrokMarketplace(entries);
assert(grokMarket.plugins[0].source.source === "local", "grok marketplace uses local sources");
assert(grokMarket.plugins[0].source.path === "./teaching", "grok local path is relative");

const codexMarket = buildCodexMarketplace(entries);
assert(codexMarket.plugins[0].policy.authentication === "ON_FIRST_USE", "skill plugins auth on first use");
assert(codexMarket.plugins[1].policy.authentication === "ON_INSTALL", "MCP plugins auth on install");

const fixture = mkdtempSync(join(tmpdir(), "harness-marketplaces-"));
try {
  mkdirSync(join(fixture, ".cursor-plugin"), { recursive: true });
  mkdirSync(join(fixture, "teaching/.cursor-plugin"), { recursive: true });
  mkdirSync(join(fixture, "teaching/skills/teaching"), { recursive: true });
  mkdirSync(join(fixture, "third_party/gmail/.cursor-plugin"), { recursive: true });
  writeFileSync(
    join(fixture, ".cursor-plugin/marketplace.json"),
    JSON.stringify({
      name: "cursor-plugins",
      plugins: [
        { name: "teaching", source: "teaching", description: "Learn things." },
        { name: "gmail", source: "third_party/gmail", description: "Read mail." },
      ],
    })
  );
  writeFileSync(
    join(fixture, "teaching/.cursor-plugin/plugin.json"),
    JSON.stringify(skillPlugin)
  );
  writeFileSync(join(fixture, "teaching/skills/teaching/SKILL.md"), "# teaching\n");
  writeFileSync(
    join(fixture, "third_party/gmail/.cursor-plugin/plugin.json"),
    JSON.stringify(mcpPlugin)
  );
  writeFileSync(
    join(fixture, "third_party/gmail/mcp.json"),
    JSON.stringify({ mcpServers: { gmail: { url: "https://example.com" } } })
  );

  const detected = detectComponents(join(fixture, "teaching"), skillPlugin);
  assert(detected.skills === true, "detects skills directory");
  assert(detected.mcp === false, "does not invent MCP");

  const { files } = generateHarnessMarketplaces(fixture);
  assert(files.size === 10, `writes marketplace + manifests + mcp shim (${files.size})`);
  assert(
    existsSyncSafe(join(fixture, ".claude-plugin/marketplace.json")),
    "writes claude marketplace"
  );
  assert(
    existsSyncSafe(join(fixture, ".grok-plugin/marketplace.json")),
    "writes grok marketplace"
  );
  assert(
    existsSyncSafe(join(fixture, ".agents/plugins/marketplace.json")),
    "writes codex marketplace"
  );
  assert(
    existsSyncSafe(join(fixture, "third_party/gmail/.mcp.json")),
    "copies mcp.json to .mcp.json"
  );
  const copied = readFileSync(join(fixture, "third_party/gmail/.mcp.json"), "utf-8");
  const original = readFileSync(join(fixture, "third_party/gmail/mcp.json"), "utf-8");
  assert(copied === original, "mcp shim is a byte copy");

  const check = generateHarnessMarketplaces(fixture, { check: true });
  assert(check.mismatches.length === 0, "check passes after generate");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

function existsSyncSafe(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

if (failed) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll generator tests passed.");
