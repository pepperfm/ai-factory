---
title: Extensions
description: Extend AI Factory with custom commands, skills, MCP servers, and agent files.
navigation:
  icon: i-lucide-plug
---

Extensions let third-party developers add new capabilities to AI Factory: custom CLI commands, MCP servers, skill injections, runtime definitions, runtime-specific agent files, and more.

Extensions survive `ai-factory update`. Injections and managed agent files are automatically re-applied after base skills are refreshed.

## For users

### Install an extension

```bash [Terminal]
# From a local directory
ai-factory extension add ./my-extension

# From a git repository
ai-factory extension add https://github.com/user/aif-ext-example.git

# From npm
ai-factory extension add aif-ext-example
```

### Manage extensions

```bash [Terminal]
# List installed extensions
ai-factory extension list

# Update extensions from their sources
ai-factory extension update

# Update a specific extension
ai-factory extension update aif-ext-example

# Force refresh even if version is unchanged
ai-factory extension update --force

# Remove an extension
ai-factory extension remove aif-ext-example
```

### What happens on install

1. Extension files are copied to `.ai-factory/extensions/<name>/`
2. Extension is recorded in `.ai-factory.json` under `extensions`
3. Extension skills are installed into configured agents
4. Runtime definitions are added to the effective runtime registry
5. Agent files are copied into matching `agentsDir` locations
6. Injections are applied to matching skill files
7. MCP servers are merged into each agent's settings file
8. Custom CLI commands become available immediately

### What happens on update

Running `ai-factory update` now includes extension refresh:

1. Optional self-update check for the CLI
2. Refresh installed extensions from their saved sources
3. Update base skills with per-agent status reporting
4. Reinstall replacement skills from extension manifests
5. Re-apply injections and managed agent files

`ai-factory update --force` forces both base-skill reinstall and extension refresh, even when versions appear unchanged.

### Source-specific update behavior

| Source type | Version check | `--force` behavior |
| --- | --- | --- |
| npm | Registry lookup, skip if unchanged | Always re-download |
| GitHub | Fetch `extension.json` via API, skip if unchanged | Always re-clone |
| GitLab / other git | Requires `--force` | Always re-clone |
| Local path | Requires `--force` | Re-copy from source |

If GitHub-backed refreshes are frequent, set `GITHUB_TOKEN` to avoid low unauthenticated rate limits.

## For developers

### Extension structure

An extension is a directory, npm package, or git repository with `extension.json` in the root:

```text
my-extension/
├── extension.json
├── package.json
├── commands/
│   └── hello.js
├── injections/
│   └── implement-extra.md
├── skills/
│   ├── my-skill/
│   │   └── SKILL.md
│   └── my-commit/
│       └── SKILL.md
└── mcp/
    └── my-server.json
```

If you plan to publish via npm, include `package.json`. For local directory and git sources, `extension.json` is the only required manifest file.

### `extension.json`

```json
{
  "name": "aif-ext-example",
  "version": "1.0.0",
  "description": "Example extension",
  "commands": [
    {
      "name": "hello",
      "description": "Say hello",
      "module": "./commands/hello.js"
    }
  ],
  "agents": [
    {
      "id": "my-agent",
      "displayName": "My Agent",
      "configDir": ".my-agent",
      "skillsDir": ".my-agent/skills",
      "agentsDir": ".my-agent/agents",
      "agentFileExtension": ".toml",
      "settingsFile": null,
      "supportsMcp": false,
      "skillsCliAgent": null
    }
  ],
  "injections": [
    {
      "target": "aif-implement",
      "position": "append",
      "file": "./injections/implement-extra.md"
    }
  ]
}
```

Only `name` and `version` are required. The rest is optional.

### Injections

Injections prepend or append content to an existing skill without replacing it completely. AI Factory wraps injected content in tracking markers so it can be applied idempotently and removed cleanly.

Typical use cases:

- add extra post-implementation checks to `/aif-implement`
- extend `/aif-commit` with organization-specific commit policy
- attach additional review guidance to `/aif-review`

### MCP servers

Extensions can ship MCP server templates that are merged into compatible agent settings during install. This is how third-party integrations become available without manual copy-paste into every runtime.

## See also

- [Configuration](/essentials/configuration) — where extension metadata is stored
- [Config Reference](/essentials/config-reference) — config ownership and current schema limits
- [Security](/essentials/security) — external extension and skill scanning rules
