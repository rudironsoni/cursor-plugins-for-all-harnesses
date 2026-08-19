#!/usr/bin/env node

/**
 * Generate Claude Code, Grok Build, and Codex marketplace catalogs
 * (plus per-plugin manifests) from the Cursor marketplace.
 *
 * Source of truth: .cursor-plugin/marketplace.json and each plugin's
 * .cursor-plugin/plugin.json
 *
 * Usage:
 *   node scripts/generate-harness-marketplaces.mjs
 *   node scripts/generate-harness-marketplaces.mjs --check
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

export const MARKETPLACE_NAME = "cursor-plugins";
export const MARKETPLACE_OWNER = {
  name: "Rudimar Ronsoni",
  email: "rudimar@outlook.com",
  url: "https://github.com/rudironsoni",
};
export const MARKETPLACE_HOMEPAGE =
  "https://github.com/rudironsoni/cursor-plugins-for-all-harnesses";
export const UPSTREAM = "https://github.com/cursor/plugins";

const DESCRIPTION =
  "Cursor plugins packaged as marketplaces for Grok Build, Claude Code, and Codex.";

export function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function toRelativeSource(source) {
  return source.startsWith("./") ? source : `./${source}`;
}

export function grokCategory(category) {
  switch (category) {
    case "utilities":
    case "productivity":
      return "productivity";
    case "developer-tools":
    case "integrations":
    default:
      return "development";
  }
}

export function claudeCategory(category) {
  switch (category) {
    case "developer-tools":
      return "development";
    case "utilities":
      return "productivity";
    case "productivity":
      return "productivity";
    case "integrations":
      return "productivity";
    default:
      return category ?? "development";
  }
}

export function codexCategory(category) {
  switch (category) {
    case "developer-tools":
      return "Developer Tools";
    case "utilities":
      return "Utilities";
    case "productivity":
      return "Productivity";
    case "integrations":
      return "Productivity";
    default:
      return "Developer Tools";
  }
}

export function detectComponents(pluginDir, cursorPlugin = {}) {
  const has = (name) => existsSync(join(pluginDir, name));
  return {
    skills: Boolean(cursorPlugin.skills) || has("skills"),
    agents: Boolean(cursorPlugin.agents) || has("agents"),
    hooks: Boolean(cursorPlugin.hooks) || has("hooks"),
    rules: Boolean(cursorPlugin.rules) || has("rules"),
    mcp: Boolean(cursorPlugin.mcpServers) || has("mcp.json") || has(".mcp.json"),
  };
}

function pickAuthor(cursorPlugin) {
  if (!cursorPlugin.author?.name) return undefined;
  const author = { name: cursorPlugin.author.name };
  if (cursorPlugin.author.email) author.email = cursorPlugin.author.email;
  if (cursorPlugin.author.url) author.url = cursorPlugin.author.url;
  return author;
}

function sharedMetadata(cursorPlugin) {
  const out = {
    name: cursorPlugin.name,
    version: cursorPlugin.version ?? "1.0.0",
    description: cursorPlugin.description ?? "",
  };
  const author = pickAuthor(cursorPlugin);
  if (author) out.author = author;
  if (cursorPlugin.homepage) out.homepage = cursorPlugin.homepage;
  if (cursorPlugin.repository) out.repository = cursorPlugin.repository;
  if (cursorPlugin.license) out.license = cursorPlugin.license;
  if (cursorPlugin.logo) out.logo = cursorPlugin.logo;
  if (Array.isArray(cursorPlugin.keywords) && cursorPlugin.keywords.length) {
    out.keywords = cursorPlugin.keywords;
  }
  return out;
}

export function buildClaudePluginManifest(cursorPlugin, components) {
  const manifest = {
    ...sharedMetadata(cursorPlugin),
  };
  if (cursorPlugin.displayName) manifest.displayName = cursorPlugin.displayName;
  if (components.skills) manifest.skills = "./skills/";
  if (components.agents) manifest.agents = "./agents/";
  if (components.mcp) manifest.mcpServers = "./.mcp.json";
  return manifest;
}

export function buildGrokPluginManifest(cursorPlugin, components) {
  const manifest = {
    ...sharedMetadata(cursorPlugin),
  };
  if (components.skills) manifest.skills = "./skills/";
  if (components.agents) manifest.agents = "./agents/";
  if (components.mcp) manifest.mcpServers = "./.mcp.json";
  return manifest;
}

export function buildCodexPluginManifest(cursorPlugin, components) {
  const manifest = {
    name: cursorPlugin.name,
    version: cursorPlugin.version ?? "1.0.0",
    description: cursorPlugin.description ?? "",
  };
  const author = pickAuthor(cursorPlugin);
  if (author) manifest.author = author;
  if (cursorPlugin.homepage) manifest.homepage = cursorPlugin.homepage;
  if (cursorPlugin.repository) manifest.repository = cursorPlugin.repository;
  if (cursorPlugin.license) manifest.license = cursorPlugin.license;
  if (Array.isArray(cursorPlugin.keywords) && cursorPlugin.keywords.length) {
    manifest.keywords = cursorPlugin.keywords;
  }
  if (components.skills) manifest.skills = "./skills/";
  if (components.mcp) manifest.mcpServers = "./.mcp.json";
  manifest.interface = {
    displayName: cursorPlugin.displayName ?? cursorPlugin.name,
    shortDescription: cursorPlugin.description ?? "",
    developerName: cursorPlugin.author?.name ?? "Cursor",
    category: codexCategory(cursorPlugin.category),
  };
  if (cursorPlugin.logo) manifest.interface.logo = `./${cursorPlugin.logo.replace(/^\.\//, "")}`;
  return manifest;
}

export function buildClaudeMarketplace(entries) {
  return {
    $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
    name: MARKETPLACE_NAME,
    description: DESCRIPTION,
    owner: MARKETPLACE_OWNER,
    metadata: {
      pluginRoot: "./",
      generatedFrom: ".cursor-plugin/marketplace.json",
      upstream: UPSTREAM,
    },
    plugins: entries.map((entry) => {
      const plugin = {
        name: entry.name,
        source: toRelativeSource(entry.source),
        description: entry.description ?? entry.plugin.description ?? "",
        version: entry.plugin.version ?? "1.0.0",
        category: claudeCategory(entry.plugin.category),
      };
      const author = pickAuthor(entry.plugin);
      if (author) plugin.author = author;
      if (entry.plugin.homepage) plugin.homepage = entry.plugin.homepage;
      if (entry.plugin.license) plugin.license = entry.plugin.license;
      if (Array.isArray(entry.plugin.keywords) && entry.plugin.keywords.length) {
        plugin.keywords = entry.plugin.keywords;
      }
      if (entry.components.skills) plugin.skills = "./skills/";
      if (entry.components.agents) plugin.agents = "./agents/";
      if (entry.components.mcp) plugin.mcpServers = "./.mcp.json";
      return plugin;
    }),
  };
}

export function buildGrokMarketplace(entries) {
  return {
    name: MARKETPLACE_NAME,
    description: DESCRIPTION,
    owner: {
      name: MARKETPLACE_OWNER.name,
      url: MARKETPLACE_OWNER.url,
    },
    plugins: entries.map((entry) => {
      const plugin = {
        name: entry.name,
        description: entry.description ?? entry.plugin.description ?? "",
        version: entry.plugin.version ?? "1.0.0",
        category: grokCategory(entry.plugin.category),
        source: {
          source: "local",
          path: toRelativeSource(entry.source),
        },
      };
      if (entry.plugin.homepage) plugin.homepage = entry.plugin.homepage;
      if (Array.isArray(entry.plugin.keywords) && entry.plugin.keywords.length) {
        plugin.keywords = entry.plugin.keywords;
      }
      return plugin;
    }),
  };
}

export function buildCodexMarketplace(entries) {
  return {
    name: MARKETPLACE_NAME,
    interface: {
      displayName: "Cursor Plugins for All Harnesses",
    },
    plugins: entries.map((entry) => {
      const plugin = {
        name: entry.name,
        source: {
          source: "local",
          path: toRelativeSource(entry.source),
        },
        policy: {
          installation: "AVAILABLE",
          authentication: entry.components.mcp ? "ON_INSTALL" : "ON_FIRST_USE",
        },
        category: codexCategory(entry.plugin.category),
      };
      if (entry.description ?? entry.plugin.description) {
        plugin.description = entry.description ?? entry.plugin.description;
      }
      return plugin;
    }),
  };
}

export function collectEntries(repoRoot) {
  const marketplace = loadJSON(join(repoRoot, ".cursor-plugin/marketplace.json"));
  return (marketplace.plugins ?? []).map((entry) => {
    const pluginDir = resolve(repoRoot, entry.source);
    const pluginJsonPath = join(pluginDir, ".cursor-plugin/plugin.json");
    if (!existsSync(pluginJsonPath)) {
      throw new Error(`Missing ${relative(repoRoot, pluginJsonPath)}`);
    }
    const plugin = loadJSON(pluginJsonPath);
    return {
      name: entry.name,
      source: entry.source,
      description: entry.description,
      pluginDir,
      plugin,
      components: detectComponents(pluginDir, plugin),
    };
  });
}

function plannedFiles(repoRoot, entries) {
  const files = new Map();
  files.set(
    join(repoRoot, ".claude-plugin/marketplace.json"),
    stableStringify(buildClaudeMarketplace(entries))
  );
  files.set(
    join(repoRoot, ".grok-plugin/marketplace.json"),
    stableStringify(buildGrokMarketplace(entries))
  );
  files.set(
    join(repoRoot, ".agents/plugins/marketplace.json"),
    stableStringify(buildCodexMarketplace(entries))
  );

  for (const entry of entries) {
    files.set(
      join(entry.pluginDir, ".claude-plugin/plugin.json"),
      stableStringify(buildClaudePluginManifest(entry.plugin, entry.components))
    );
    files.set(
      join(entry.pluginDir, ".grok-plugin/plugin.json"),
      stableStringify(buildGrokPluginManifest(entry.plugin, entry.components))
    );
    files.set(
      join(entry.pluginDir, ".codex-plugin/plugin.json"),
      stableStringify(buildCodexPluginManifest(entry.plugin, entry.components))
    );

    const mcpPath = join(entry.pluginDir, "mcp.json");
    if (entry.components.mcp && existsSync(mcpPath)) {
      files.set(join(entry.pluginDir, ".mcp.json"), readFileSync(mcpPath, "utf-8"));
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
    if (!existsSync(path)) {
      mismatches.push(`${relative(root, path)}: missing`);
      continue;
    }
    const actual = readFileSync(path, "utf-8");
    if (actual !== expected) {
      mismatches.push(`${relative(root, path)}: stale`);
    }
  }
  return mismatches;
}

export function generateHarnessMarketplaces(repoRoot, { check = false } = {}) {
  const entries = collectEntries(repoRoot);
  const files = plannedFiles(repoRoot, entries);
  if (check) {
    return { entries, files, mismatches: checkFiles(files) };
  }
  writeFiles(files);
  return { entries, files, mismatches: [] };
}

function isMain() {
  const invoked = process.argv[1] && resolve(process.argv[1]);
  return invoked === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const check = process.argv.includes("--check");
  try {
    const { entries, files, mismatches } = generateHarnessMarketplaces(root, { check });
    if (check) {
      if (mismatches.length) {
        console.error("Harness marketplace files are out of date:");
        for (const line of mismatches) console.error(`  ${line}`);
        console.error("\nRun: node scripts/generate-harness-marketplaces.mjs");
        process.exit(1);
      }
      console.log(
        `Harness marketplace files are up to date (${files.size} files, ${entries.length} plugins).`
      );
      process.exit(0);
    }
    console.log(
      `Wrote ${files.size} harness marketplace files for ${entries.length} plugins.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
