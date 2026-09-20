#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
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

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateMarketplace = ajv.compile(marketplaceSchema);
const validatePlugin = ajv.compile(pluginSchema);

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

// 1. Validate marketplace.json
const marketplacePath = resolve(root, ".cursor-plugin/marketplace.json");

if (!existsSync(marketplacePath)) {
  fail(".cursor-plugin/marketplace.json not found");
  process.exit(1);
}

const marketplace = loadJSON(marketplacePath);

if (!validateMarketplace(marketplace)) {
  fail("marketplace.json schema validation failed:");
  for (const err of validateMarketplace.errors) {
    console.error(`  ${err.instancePath || "/"}: ${err.message}`);
  }
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
const APP_ID = /^(connector_|asdk_app_|templated_apps_)/;

function catalogNames(path, mapName) {
  if (!existsSync(path)) {
    fail(`${relativeRoot(path)} is missing`);
    return [];
  }
  const catalog = loadJSON(path);
  return (catalog.plugins ?? []).map((plugin) => mapName(plugin));
}

function relativeRoot(path) {
  return path.replace(`${root}/`, "");
}

const cursorNames = (marketplace.plugins ?? []).map((plugin) => plugin.name);
const claudeNames = catalogNames(
  resolve(root, ".claude-plugin/marketplace.json"),
  (plugin) => plugin.name
);
const grokNames = catalogNames(
  resolve(root, ".grok-plugin/marketplace.json"),
  (plugin) => plugin.name
);
const codexNames = catalogNames(
  resolve(root, ".agents/plugins/marketplace.json"),
  (plugin) => plugin.name
);

function missingFrom(label, names) {
  const have = new Set(names);
  for (const name of cursorNames) {
    if (!have.has(name)) fail(`${label} catalog is missing "${name}"`);
  }
}

missingFrom("Claude", claudeNames);
missingFrom("Grok", grokNames);
missingFrom("Codex", codexNames);

for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const requiredFiles = [
    ".claude-plugin/plugin.json",
    ".grok-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    "opencode.js",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(resolve(pluginDir, file))) {
      fail(`Plugin "${entry.name}": missing ${file}`);
    }
  }

  const hasMcp = existsSync(resolve(pluginDir, "mcp.json"));
  if (hasMcp && !existsSync(resolve(pluginDir, ".mcp.json"))) {
    fail(`Plugin "${entry.name}": missing .mcp.json`);
  }

  const codexPath = resolve(pluginDir, ".codex-plugin/plugin.json");
  if (!existsSync(codexPath)) continue;
  const codex = loadJSON(codexPath);
  if (codex.mcpServers) {
    fail(`Plugin "${entry.name}": Codex manifest must not set mcpServers`);
  }
  const iface = codex.interface;
  if (!iface || typeof iface !== "object") {
    fail(`Plugin "${entry.name}": Codex manifest is missing interface`);
    continue;
  }
  for (const field of [
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
  ]) {
    if (!iface[field] || typeof iface[field] !== "string") {
      fail(`Plugin "${entry.name}": interface.${field} is required`);
    }
  }
  if (
    typeof iface.shortDescription === "string" &&
    (iface.shortDescription.length > 240 ||
      iface.shortDescription.includes("\n"))
  ) {
    fail(
      `Plugin "${entry.name}": interface.shortDescription must be one line of at most 240 characters`
    );
  }
  if (!OPENAI_CATEGORIES.has(iface.category)) {
    fail(
      `Plugin "${entry.name}": interface.category "${iface.category}" is not an OpenAI category`
    );
  }
  if (!Array.isArray(iface.capabilities) || iface.capabilities.length === 0) {
    fail(`Plugin "${entry.name}": interface.capabilities must be a non-empty list`);
  }
  if (codex.apps) {
    const appPath = resolve(pluginDir, ".app.json");
    if (!existsSync(appPath)) {
      fail(`Plugin "${entry.name}": apps is set but .app.json is missing`);
    } else {
      const apps = loadJSON(appPath).apps || {};
      for (const [key, app] of Object.entries(apps)) {
        if (!APP_ID.test(app.id || "")) {
          fail(
            `Plugin "${entry.name}": .app.json "${key}" id "${app.id}" is not a ChatGPT app id`
          );
        }
      }
    }
  }
}

// 3. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}
