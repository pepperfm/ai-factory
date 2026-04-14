---
title: Configuration
description: Customize agents, MCP servers, config paths, extensions, and project structure.
navigation:
  icon: i-lucide-settings
---

## `.ai-factory.json`

```json
{
  "version": "2.8.0",
  "agents": [
    {
      "id": "claude",
      "skillsDir": ".claude/skills",
      "agentsDir": ".claude/agents",
      "installedSkills": ["aif", "aif-plan", "aif-improve", "aif-implement", "aif-commit", "aif-build-automation"],
      "installedAgentFiles": [
        "best-practices-sidecar.md",
        "commit-preparer.md",
        "docs-auditor.md",
        "implement-coordinator.md",
        "implement-worker.md",
        "loop-critic.md",
        "loop-evaluator.md",
        "loop-invariant-prep.md",
        "loop-orchestrator.md",
        "loop-perf-prep.md",
        "loop-planner.md",
        "loop-producer.md",
        "loop-refiner.md",
        "loop-test-prep.md",
        "plan-coordinator.md",
        "plan-polisher.md",
        "review-sidecar.md",
        "security-sidecar.md"
      ],
      "mcp": {
        "github": true,
        "postgres": false,
        "filesystem": false,
        "chromeDevtools": false,
        "playwright": false
      }
    },
    {
      "id": "codex",
      "skillsDir": ".codex/skills",
      "agentsDir": ".codex/agents",
      "installedSkills": ["aif", "aif-plan", "aif-implement"],
      "mcp": {
        "github": false,
        "postgres": false,
        "filesystem": false,
        "chromeDevtools": false,
        "playwright": false
      }
    }
  ],
  "extensions": [
    {
      "name": "aif-ext-example",
      "source": "https://github.com/user/aif-ext-example.git",
      "version": "1.0.0"
    }
  ]
}
```

The `agents` array can include built-in agent IDs plus runtime IDs provided by installed extensions. Runtimes that support custom agent files also persist `agentsDir` and `installedAgentFiles`, so `ai-factory update` can refresh package-managed agent files alongside skills.

The optional `extensions` array tracks installed extensions by name, original source, and version. `ai-factory update` refreshes extensions from their saved sources before base-skill updates.

## `.ai-factory/config.yaml` — user preferences

`config.yaml` is the user-editable layer for language, paths, workflow settings, and rules hierarchy. `.ai-factory.json` remains package-managed CLI state.

```yaml
language:
  ui: en
  artifacts: en
  technical_terms: keep

paths:
  description: .ai-factory/DESCRIPTION.md
  architecture: .ai-factory/ARCHITECTURE.md
  docs: docs/
  roadmap: .ai-factory/ROADMAP.md
  research: .ai-factory/RESEARCH.md
  rules_file: .ai-factory/RULES.md
  plan: .ai-factory/PLAN.md
  plans: .ai-factory/plans/
  fix_plan: .ai-factory/FIX_PLAN.md
  security: .ai-factory/SECURITY.md
  references: .ai-factory/references/
  patches: .ai-factory/patches/
  evolutions: .ai-factory/evolutions/
  evolution: .ai-factory/evolution/
  specs: .ai-factory/specs/
  rules: .ai-factory/rules/

git:
  enabled: true
  base_branch: main
  create_branches: true
  branch_prefix: feature/
  skip_push_after_commit: false
```

## Config-aware vs config-agnostic skills

Current **config-aware** built-ins read `config.yaml` at startup. This includes:

- `/aif`, `/aif-plan`, `/aif-implement`, `/aif-verify`, `/aif-commit`, `/aif-review`
- `/aif-roadmap`, `/aif-explore`, `/aif-loop`, `/aif-rules`
- `/aif-architecture`, `/aif-docs`, `/aif-fix`, `/aif-improve`, `/aif-evolve`, `/aif-reference`, `/aif-security-checklist`

Current **config-agnostic** built-ins include:

- `/aif-best-practices`
- `/aif-build-automation`
- `/aif-ci`
- `/aif-dockerize`
- `/aif-grounded`
- `/aif-skill-generator`

Those commands currently rely on repository context, explicit arguments, or fixed paths rather than `config.yaml`.

## MCP configuration

AI Factory can configure these MCP servers:

| MCP server | Use case | Env variable |
| --- | --- | --- |
| GitHub | PRs, issues, repo operations | `GITHUB_TOKEN` |
| Postgres | Database queries | `DATABASE_URL` |
| Filesystem | Advanced file operations | - |
| Chrome Devtools | Browser inspection, debugging, performance | - |
| Playwright | Browser automation and web testing | - |

Configuration is saved to the agent's MCP settings file. GitHub Copilot uses `.vscode/mcp.json` with `servers` as the root object. Most other agents use `mcpServers`.

## Project structure

After initialization (example for Claude Code):

::project-structure-tree
::

## Reflex Loop files

`/aif-loop` keeps state lean and resumable between sessions:

- `.ai-factory/evolution/current.json` — active loop pointer
- `.ai-factory/evolution/<task-alias>/run.json` — current loop snapshot
- `.ai-factory/evolution/<task-alias>/history.jsonl` — append-only event history
- `.ai-factory/evolution/<task-alias>/artifact.md` — latest artifact output

For full phase contracts and stop conditions, see [Reflex Loop](/ai/reflex-loop).

## Rules hierarchy

AI Factory supports a three-level rules hierarchy:

1. **`paths.rules_file`** — universal project axioms
2. **`rules/base.md`** — project-specific base conventions
3. **`rules.<area>`** — area-specific rules such as `api`, `frontend`, `backend`, or `database`

Priority is always: more specific wins. `rules.<area>` > `rules/base.md` > `paths.rules_file`.

## Best practices

### Logging

All implementations should include explicit, configurable logging:

- Use clear log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`)
- Control verbosity via environment or project config
- Rotate file logs when logs are persisted outside stdout/stderr

### Commits

- Use commit checkpoints every 3 to 5 tasks for larger plans
- Prefer conventional commits with meaningful scope and intent
- Keep commit boundaries aligned with plan checkpoints

### Testing

- Testing policy is asked during planning
- If you say "no tests", test tasks are not created implicitly
- If tests are enabled, they should be reflected in the plan rather than added ad hoc later

## See also

- [Getting Started](/getting-started) — installation, supported agents, and first project
- [Development Workflow](/essentials/development-workflow) — how the workflow skills connect
- [Extensions](/essentials/extensions) — extension metadata, installs, and refresh behavior
- [Config Reference](/essentials/config-reference) — key-by-key schema and readers
- [Reflex Loop](/ai/reflex-loop) — contracts and storage layout for `/aif-loop`
- [Security](/essentials/security) — external skill scanning and trust boundaries
