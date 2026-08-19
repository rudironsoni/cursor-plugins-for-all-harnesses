# Cursor plugins for all harnesses

Official [Cursor plugins](https://github.com/cursor/plugins) packaged so they can be installed from **Cursor**, **Grok Build**, **Claude Code**, and **Codex** marketplaces.

Each plugin is a standalone directory (repo root or `third_party/`) with a Cursor manifest at `.cursor-plugin/plugin.json`. Sibling manifests and catalogs make the same plugin discoverable on the other harnesses.

## Install a marketplace

```bash
# Grok Build
grok plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
grok plugin install teaching@cursor-plugins

# Claude Code
claude plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
claude plugin install teaching@cursor-plugins

# Codex
codex plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
codex plugin install teaching@cursor-plugins
```

Cursor still uses `.cursor-plugin/marketplace.json`. Add this repo as a custom marketplace, or copy a plugin directory into `~/.cursor/plugins/local/`.

Replace `teaching` with any plugin `name` from the table below.

## Harness compatibility

| Component | Cursor | Grok Build | Claude Code | Codex |
|:----------|:------:|:----------:|:-----------:|:-----:|
| Skills (`skills/*/SKILL.md`) | yes | yes | yes | yes |
| Agents (`agents/`) | yes | yes | yes | — |
| MCP (`mcp.json` / `.mcp.json`) | yes | yes | yes | yes |
| Hooks | yes | — | — | — |
| Rules (`.mdc`) | yes | — | — | — |

Hooks and rules stay Cursor-only: their event names and `.mdc` format are not portable. Skills, agents, and MCP servers are shared.

The catalogs are hand-maintained JSON. After adding or removing a plugin, edit each catalog and the per-plugin harness manifests. See [scripts/sync-upstream.md](scripts/sync-upstream.md).

```bash
node scripts/validate-plugins.mjs
```

Harness files:

- `.grok-plugin/marketplace.json`
- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- per-plugin `.grok-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`
- `.mcp.json` (copy of `mcp.json` for Grok/Claude/Codex default discovery)

## Plugins

| `name` | Plugin | Author | Category | `description` (from marketplace) |
|:-------|:-------|:-------|:---------|:-------------------------------------|
| `teaching` | [Teaching](teaching/) | Cursor | Utilities | Skill mapping, practice plans, and learning retrospectives. |
| `continual-learning` | [Continual Learning](continual-learning/) | Cursor | Developer Tools | Incremental transcript-driven memory updates for AGENTS.md using high-signal bullet points only. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Cursor | Developer Tools | Internal team workflows for CI, code review, shipping, local automation, and verification. |
| `thermos` | [Thermos](thermos/) | Cursor | Developer Tools | Thermo-nuclear branch review: deep security/correctness audits, harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional merge-ready PR flows. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor | Developer Tools | Scaffold and validate new agent plugins. |
| `ralph-loop` | [Ralph Loop](ralph-loop/) | Cursor | Developer Tools | Iterative self-referential AI loops using the Ralph Wiggum technique. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor | Developer Tools | CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Cursor | Developer Tools | Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, dry-run. |
| `pr-review-canvas` | [PR Review Canvas](pr-review-canvas/) | Cursor | Developer Tools | Render PR diffs as review canvases grouped by importance. |
| `docs-canvas` | [Docs Canvas](docs-canvas/) | Cursor | Developer Tools | Render documentation as a navigable canvas. |
| `cursor-sdk` | [Cursor SDK](cursor-sdk/) | Cursor | Developer Tools | Build apps, scripts, and automations with the TypeScript SDK. |
| `orchestrate` | [Orchestrate](orchestrate/) | Cursor | Developer Tools | Fan large tasks out across parallel cloud agents with planners, workers, verifiers, and structured handoffs. |
| `pstack` | [pstack](pstack/) | Lauren Tan | Developer Tools | if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence. |
| `gmail` | [Gmail](third_party/gmail/) | Cursor | Productivity | Search, read, draft, and manage email. |
| `google-drive` | [Google Drive](third_party/google-drive/) | Cursor | Productivity | Search, read, create, and share files. |
| `google-calendar` | [Google Calendar](third_party/google-calendar/) | Cursor | Productivity | Search events and schedule meetings. |
| `gong` | [Gong](third_party/gong/) | Cursor | Integrations | Pull account summaries, deal insights, and call briefs. |
| `salesforce` | [Salesforce](third_party/salesforce/) | Cursor | Integrations | Query, create, and update records in your org. |
| `playwright` | [Playwright](third_party/playwright/) | Cursor | Integrations | Navigate, click, screenshot, and test in a real browser. |
| `github` | [GitHub](third_party/github/) | Cursor | Integrations | Manage repos, issues, pull requests, and Actions. |
| `ashby` | [Ashby](third_party/ashby/) | Cursor | Integrations | Search candidates, prep interviews, and manage pipeline tasks. |
| `hubspot` | [HubSpot](third_party/hubspot/) | Cursor | Integrations | Search and update contacts, companies, deals, and tickets. |
| `intercom` | [Intercom](third_party/intercom/) | Cursor | Integrations | Search conversations, contacts, and Help Center articles. |
| `zoom` | [Zoom](third_party/zoom/) | Cursor | Integrations | Search meetings, pull transcripts, and work with Zoom Docs. |
| `x` | [X](third_party/x/) | Cursor | Integrations | Search posts, read timelines, pull trends, and manage bookmarks. |
| `clay` | [Clay](third_party/clay/) | Cursor | Integrations | Enrich people and companies, run AI research agents. |
| `circleback` | [Circleback](third_party/circleback/) | Cursor | Integrations | Search meetings, transcripts, action items, and emails. |
| `docusign` | [Docusign](third_party/docusign/) | Cursor | Integrations | Manage envelopes, templates, workflows, and agreements. |
| `navan` | [Navan](third_party/navan/) | Cursor | Integrations | Query expenses, travel bookings, policies, and cards. |
| `profound` | [Profound](third_party/profound/) | Cursor | Integrations | Track AI visibility, sentiment, and citations. |
| `juicebox` | [Juicebox](third_party/juicebox/) | Cursor | Integrations | Query recruiting analytics, shortlists, and sourcing agents. |
| `outreach` | [Outreach](third_party/outreach/) | Cursor | Integrations | Search sequences, prospects, and Kaia meetings. |
| `amplemarket` | [Amplemarket](third_party/amplemarket/) | Cursor | Integrations | Search people and companies, enrich leads, run sequences. |
Author values match each plugin’s `plugin.json` `author.name` (Cursor lists `plugins@cursor.com` in the manifest).

## Repository structure

This is a multi-plugin, multi-harness marketplace repository. Each catalog is a committed JSON file.

```
plugins/
├── .cursor-plugin/marketplace.json    # Cursor catalog (source of truth)
├── .grok-plugin/marketplace.json      # Grok Build catalog
├── .claude-plugin/marketplace.json    # Claude Code catalog
├── .agents/plugins/marketplace.json   # Codex catalog
├── plugin-name/
│   ├── .cursor-plugin/plugin.json
│   ├── .grok-plugin/plugin.json
│   ├── .claude-plugin/plugin.json
│   ├── .codex-plugin/plugin.json
│   ├── skills/                        # Agent skills (SKILL.md with frontmatter)
│   ├── agents/                        # Subagent definitions
│   ├── rules/                         # Cursor rules (.mdc) — Cursor only
│   ├── mcp.json / .mcp.json           # MCP server definitions
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
└── ...
```

## License

MIT
