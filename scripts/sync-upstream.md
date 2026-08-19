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

`README.md` will usually conflict. Start from upstream's plugin table, then put back:

- the fork title and install commands
- the extra catalog tree
- the link to this file

Do not keep the fork README wholesale. Upstream plugin additions and removals must stay.

## After rebase

When upstream adds a plugin, copy a sibling plugin's harness files and edit the names:

1. Add a row to `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `.github/plugin/marketplace.json`, and `.grok-plugin/marketplace.json`.
2. Add `<plugin>/.claude-plugin/plugin.json` and `<plugin>/.codex-plugin/plugin.json`.
3. For MCP plugins, set `mcpServers` to `./mcp.json` in both plugin manifests.

When upstream removes a plugin, delete those rows and the two harness dirs.

Then:

```sh
node scripts/validate-plugins.mjs
claude plugin validate --strict .
```

`scripts/validate-plugins.mjs` is the upstream Cursor checker. It does not cover the other harness files.
