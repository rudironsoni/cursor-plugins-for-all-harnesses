# Sync this fork with cursor/plugins

The JSON catalogs are the product. There is no generator.

## Remotes

```sh
git remote add upstream https://github.com/cursor/plugins.git   # once
git fetch upstream
```

## Rebase

```sh
git rebase upstream/main
```

`README.md` will usually conflict. Start from upstream's plugin table, then put back the fork title, install commands, compatibility table, and extra catalog tree.

## After rebase

When upstream adds a plugin, copy a sibling plugin's harness files and edit the names:

1. Add a row to `.claude-plugin/marketplace.json`, `.grok-plugin/marketplace.json`, and `.agents/plugins/marketplace.json`.
2. Add `<plugin>/.claude-plugin/plugin.json`, `<plugin>/.grok-plugin/plugin.json`, and `<plugin>/.codex-plugin/plugin.json`.
3. If the plugin has `mcp.json`, also add `.mcp.json` with the same contents.

When upstream removes a plugin, delete those rows and harness dirs.

Then:

```sh
node scripts/validate-plugins.mjs
```
