#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");

const MARKETPLACE_NAME = "cursor-plugins-for-all-harnesses";
const MARKETPLACE_DESCRIPTION =
  "Cursor official plugins, with marketplace manifests for Claude Code, Codex, GitHub Copilot CLI, and Grok Build.";
const OWNER = {
  name: "Rudimar Ronsoni",
  email: "rudimar.ronsoni@feverup.com",
  url: "https://github.com/rudironsoni",
};

const CODEX_CATEGORY = {
  "developer-tools": "Development",
  utilities: "Productivity",
  integrations: "Productivity",
  productivity: "Productivity",
};

const CLAUDE_PLUGIN_KEYS = [
  "name",
  "displayName",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "mcpServers",
];

const CODEX_PLUGIN_KEYS = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "skills",
  "hooks",
  "mcpServers",
];

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function stringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function relSource(source) {
  return source.startsWith("./") ? source : `./${source}`;
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

function codexCategory(category) {
  return CODEX_CATEGORY[category] ?? "Productivity";
}

function writeOrCheck(path, content, planned, changed) {
  planned.push(path);
  const previous = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (previous === content) {
    return;
  }
  changed.push(path);
  if (!checkOnly) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

const marketplacePath = join(root, ".cursor-plugin/marketplace.json");
if (!existsSync(marketplacePath)) {
  console.error("ERROR: .cursor-plugin/marketplace.json not found");
  process.exit(1);
}

const cursorMarketplace = loadJSON(marketplacePath);
const plugins = [];

for (const entry of cursorMarketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const pluginJsonPath = join(pluginDir, ".cursor-plugin/plugin.json");
  if (!existsSync(pluginJsonPath)) {
    console.error(
      `ERROR: Plugin "${entry.name}" is missing ${entry.source}/.cursor-plugin/plugin.json`,
    );
    process.exit(1);
  }
  const plugin = loadJSON(pluginJsonPath);
  if (plugin.name && plugin.name !== entry.name) {
    console.error(
      `ERROR: Plugin "${entry.name}" name mismatch in ${entry.source}/.cursor-plugin/plugin.json (${plugin.name})`,
    );
    process.exit(1);
  }
  plugins.push({
    entry,
    plugin,
    source: relSource(entry.source),
    pluginDir,
  });
}

const planned = [];
const changed = [];

const claudeMarketplace = {
  $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
  name: MARKETPLACE_NAME,
  description: MARKETPLACE_DESCRIPTION,
  owner: OWNER,
  plugins: plugins.map(({ entry, plugin, source }) => {
    const item = {
      name: entry.name,
      description: entry.description ?? plugin.description,
      source,
    };
    if (plugin.version) item.version = plugin.version;
    if (plugin.author) item.author = plugin.author;
    if (plugin.category) item.category = plugin.category;
    if (plugin.homepage) item.homepage = plugin.homepage;
    if (plugin.keywords) item.keywords = plugin.keywords;
    return item;
  }),
};

writeOrCheck(
  join(root, ".claude-plugin/marketplace.json"),
  stringify(claudeMarketplace),
  planned,
  changed,
);

const copilotMarketplace = {
  name: MARKETPLACE_NAME,
  owner: {
    name: OWNER.name,
    email: OWNER.email,
  },
  metadata: {
    description: MARKETPLACE_DESCRIPTION,
    version: "1.0.0",
  },
  plugins: plugins.map(({ entry, plugin, source }) => {
    const item = {
      name: entry.name,
      description: entry.description ?? plugin.description,
      source,
    };
    if (plugin.version) item.version = plugin.version;
    return item;
  }),
};

writeOrCheck(
  join(root, ".github/plugin/marketplace.json"),
  stringify(copilotMarketplace),
  planned,
  changed,
);

const grokMarketplace = {
  name: MARKETPLACE_NAME,
  description: MARKETPLACE_DESCRIPTION,
  owner: {
    name: OWNER.name,
    email: OWNER.email,
  },
  plugins: plugins.map(({ entry, plugin, source }) => {
    const item = {
      name: entry.name,
      description: entry.description ?? plugin.description,
      source: { type: "local", path: source },
    };
    if (plugin.category) item.category = plugin.category;
    if (plugin.version) item.version = plugin.version;
    if (plugin.author) item.author = plugin.author;
    if (plugin.homepage) item.homepage = plugin.homepage;
    if (plugin.keywords) item.keywords = plugin.keywords;
    return item;
  }),
};

writeOrCheck(
  join(root, ".grok-plugin/marketplace.json"),
  stringify(grokMarketplace),
  planned,
  changed,
);

const codexMarketplace = {
  name: MARKETPLACE_NAME,
  interface: {
    displayName: "Cursor plugins for all harnesses",
  },
  plugins: plugins.map(({ entry, plugin, source }) => ({
    name: entry.name,
    source: {
      source: "local",
      path: source,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: codexCategory(plugin.category),
  })),
};

writeOrCheck(
  join(root, ".agents/plugins/marketplace.json"),
  stringify(codexMarketplace),
  planned,
  changed,
);

for (const { plugin, pluginDir } of plugins) {
  const claudePlugin = pick(plugin, CLAUDE_PLUGIN_KEYS);
  writeOrCheck(
    join(pluginDir, ".claude-plugin/plugin.json"),
    stringify(claudePlugin),
    planned,
    changed,
  );

  const codexPlugin = pick(plugin, CODEX_PLUGIN_KEYS);
  if (plugin.displayName || plugin.category) {
    const iface = {};
    if (plugin.displayName) iface.displayName = plugin.displayName;
    if (plugin.category) iface.category = codexCategory(plugin.category);
    if (plugin.description) iface.shortDescription = plugin.description;
    if (plugin.author?.name) iface.developerName = plugin.author.name;
    codexPlugin.interface = iface;
  }
  writeOrCheck(
    join(pluginDir, ".codex-plugin/plugin.json"),
    stringify(codexPlugin),
    planned,
    changed,
  );
}

if (checkOnly) {
  if (changed.length > 0) {
    console.error(
      `ERROR: ${changed.length} harness manifest(s) are stale. Run: node scripts/generate-harness-manifests.mjs`,
    );
    for (const path of changed) {
      console.error(`  ${path.slice(root.length + 1)}`);
    }
    process.exit(1);
  }
  console.log(
    `Harness manifests are up to date (${plugins.length} plugins, ${planned.length} files).`,
  );
  process.exit(0);
}

console.log(
  `Wrote ${changed.length} of ${planned.length} harness manifest files for ${plugins.length} plugins.`,
);
