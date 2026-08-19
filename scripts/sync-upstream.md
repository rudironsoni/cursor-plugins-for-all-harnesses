# Sync this fork with cursor/plugins

`.cursor-plugin/marketplace.json` is the source of truth. After every upstream update, regenerate the other harness catalogs.

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
- the generated-catalog tree
- the link to this file

Do not keep the fork README wholesale. Upstream plugin additions and removals must stay.

## After rebase

1. For each plugin added upstream, no extra hand edit is needed. The generator reads the new Cursor manifests.
2. For each plugin removed upstream, delete leftover `<plugin>/.claude-plugin/` and `<plugin>/.codex-plugin/` dirs if git does not drop them.
3. Regenerate:

```sh
node scripts/generate-harness-manifests.mjs
node scripts/generate-harness-manifests.mjs --check
node scripts/validate-plugins.mjs
```

4. Confirm the generated catalogs list the same plugin names as `.cursor-plugin/marketplace.json`.
5. Commit the regenerated manifests and push the branch.

## Check without writing

```sh
node scripts/generate-harness-manifests.mjs --check
```

This exits 1 when a generated file is missing or stale.
