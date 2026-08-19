#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const marketplaceSchema = loadJSON(
  resolve(root, "schemas/marketplace.schema.json")
);
const pluginSchema = loadJSON(resolve(root, "schemas/plugin.schema.json"));
const claudeMarketplaceSchema = loadJSON(
  resolve(root, "schemas/claude-marketplace.schema.json")
);
const grokMarketplaceSchema = loadJSON(
  resolve(root, "schemas/grok-marketplace.schema.json")
);
const codexMarketplaceSchema = loadJSON(
  resolve(root, "schemas/codex-marketplace.schema.json")
);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateMarketplace = ajv.compile(marketplaceSchema);
const validatePlugin = ajv.compile(pluginSchema);
const validateClaudeMarketplace = ajv.compile(claudeMarketplaceSchema);
const validateGrokMarketplace = ajv.compile(grokMarketplaceSchema);
const validateCodexMarketplace = ajv.compile(codexMarketplaceSchema);

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

function reportSchemaErrors(label, validate) {
  fail(`${label} schema validation failed:`);
  for (const err of validate.errors ?? []) {
    const detail =
      err.keyword === "additionalProperties"
        ? `${err.message}: "${err.params.additionalProperty}"`
        : err.message;
    console.error(`  ${err.instancePath || "/"}: ${detail}`);
  }
}

function sourcePath(source) {
  if (typeof source === "string") return source.replace(/^\.\//, "");
  if (source && typeof source === "object") {
    return String(source.path ?? "").replace(/^\.\//, "");
  }
  return "";
}

// 1. Validate marketplace.json
const marketplacePath = resolve(root, ".cursor-plugin/marketplace.json");

if (!existsSync(marketplacePath)) {
  fail(".cursor-plugin/marketplace.json not found");
  process.exit(1);
}

const marketplace = loadJSON(marketplacePath);

if (!validateMarketplace(marketplace)) {
  reportSchemaErrors("marketplace.json", validateMarketplace);
}

// 2. Validate each plugin
for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const pluginJsonPath = resolve(pluginDir, ".cursor-plugin/plugin.json");

  // Check source directory exists
  if (!existsSync(pluginDir)) {
    fail(
      `Plugin "${entry.name}": source directory "${entry.source}" does not exist`
    );
    continue;
  }

  // Check plugin.json exists
  if (!existsSync(pluginJsonPath)) {
    fail(
      `Plugin "${entry.name}": missing .cursor-plugin/plugin.json in "${entry.source}"`
    );
    continue;
  }

  const pluginJson = loadJSON(pluginJsonPath);

  if (!validatePlugin(pluginJson)) {
    fail(
      `Plugin "${entry.name}": plugin.json schema validation failed (${entry.source}/.cursor-plugin/plugin.json):`
    );
    for (const err of validatePlugin.errors) {
      const detail =
        err.keyword === "additionalProperties"
          ? `${err.message}: "${err.params.additionalProperty}"`
          : err.message;
      console.error(`  ${err.instancePath || "/"}: ${detail}`);
    }
  }

  // Check that marketplace name matches plugin name
  if (pluginJson.name && pluginJson.name !== entry.name) {
    fail(
      `Plugin "${entry.name}": marketplace name does not match plugin.json name "${pluginJson.name}"`
    );
  }
}

// 3. Validate harness marketplaces stay aligned with Cursor
const harnessCatalogs = [
  {
    label: "Claude Code",
    path: ".claude-plugin/marketplace.json",
    validate: validateClaudeMarketplace,
    pluginManifest: ".claude-plugin/plugin.json",
  },
  {
    label: "Grok Build",
    path: ".grok-plugin/marketplace.json",
    validate: validateGrokMarketplace,
    pluginManifest: ".grok-plugin/plugin.json",
  },
  {
    label: "Codex",
    path: ".agents/plugins/marketplace.json",
    validate: validateCodexMarketplace,
    pluginManifest: ".codex-plugin/plugin.json",
  },
];

const cursorNames = new Set((marketplace.plugins ?? []).map((p) => p.name));

for (const catalog of harnessCatalogs) {
  const catalogPath = resolve(root, catalog.path);
  if (!existsSync(catalogPath)) {
    fail(`${catalog.label} marketplace missing: ${catalog.path}`);
    continue;
  }

  const catalogJson = loadJSON(catalogPath);
  if (!catalog.validate(catalogJson)) {
    reportSchemaErrors(catalog.path, catalog.validate);
  }

  const harnessNames = new Set();
  for (const entry of catalogJson.plugins ?? []) {
    if (harnessNames.has(entry.name)) {
      fail(`${catalog.label}: duplicate plugin "${entry.name}"`);
    }
    harnessNames.add(entry.name);

    if (!cursorNames.has(entry.name)) {
      fail(
        `${catalog.label}: plugin "${entry.name}" is not in .cursor-plugin/marketplace.json`
      );
    }

    const rel = sourcePath(entry.source);
    if (!rel) {
      fail(`${catalog.label}: plugin "${entry.name}" has an empty source path`);
      continue;
    }

    const pluginDir = resolve(root, rel);
    if (!existsSync(pluginDir)) {
      fail(
        `${catalog.label}: plugin "${entry.name}" source "${rel}" does not exist`
      );
      continue;
    }

    const manifestPath = resolve(pluginDir, catalog.pluginManifest);
    if (!existsSync(manifestPath)) {
      fail(
        `${catalog.label}: plugin "${entry.name}" missing ${catalog.pluginManifest}`
      );
    } else {
      const harnessPlugin = loadJSON(manifestPath);
      if (harnessPlugin.name && harnessPlugin.name !== entry.name) {
        fail(
          `${catalog.label}: ${relative(root, manifestPath)} name "${harnessPlugin.name}" does not match marketplace entry "${entry.name}"`
        );
      }
    }
  }

  for (const name of cursorNames) {
    if (!harnessNames.has(name)) {
      fail(`${catalog.label}: missing plugin "${name}"`);
    }
  }
}

for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const mcpPath = resolve(pluginDir, "mcp.json");
  const shimPath = resolve(pluginDir, ".mcp.json");
  if (existsSync(mcpPath) && !existsSync(shimPath)) {
    fail(
      `Plugin "${entry.name}": has mcp.json but missing .mcp.json shim for Grok/Claude/Codex`
    );
  }
}

// 4. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}
