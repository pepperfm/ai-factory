---
title: Config Reference
description: Key-by-key reference for .ai-factory/config.yaml and which skills read it.
navigation:
  icon: i-lucide-file-cog
---

This page is the key-by-key reference for `.ai-factory/config.yaml`.

Use it when you need to know:

- which keys exist and what their defaults are
- which built-in skills read them
- which skills may write `config.yaml`
- which skills are intentionally config-agnostic

## Ownership

`config.yaml` is user-editable, but built-in skills follow a narrow write contract.

| Operation | Allowed writer | Scope |
| --- | --- | --- |
| Create the initial file | `/aif` | Whole file |
| Bootstrap config while adding the first area rule | `/aif-rules area:<name>` | Minimal scaffold plus new `rules.<area>` entry |
| Refresh the file during setup reruns | `/aif` | Whole file |
| Register a new area rule | `/aif-rules area:<name>` | `rules.<area>` entry only |
| Manual edits | Developer | Any key |

All other built-ins treat `config.yaml` as read-only input.

## Schema summary

| Section | Purpose |
| --- | --- |
| `language` | Prompt language and artifact language |
| `paths` | Artifact locations under project root |
| `workflow` | Workflow-level defaults and feature flags |
| `git` | Git-aware planning and verification behavior |
| `rules` | Base rules file plus named area-rule files |

## Key reference

### `language`

| Key | Default | Read by skills | Notes |
| --- | --- | --- | --- |
| `language.ui` | `en` | most config-aware workflow skills | UI language for prompts, questions, and summaries |
| `language.artifacts` | `en` | `/aif`, `/aif-architecture`, `/aif-roadmap`, `/aif-implement`, `/aif-loop`, `/aif-docs`, `/aif-evolve` | language for generated artifacts |
| `language.technical_terms` | `keep` | no dedicated reader yet | reserved for future translation policy |

### `paths`

| Key | Default | Used for |
| --- | --- | --- |
| `paths.description` | `.ai-factory/DESCRIPTION.md` | project description artifact |
| `paths.architecture` | `.ai-factory/ARCHITECTURE.md` | architecture source of truth |
| `paths.docs` | `docs/` | detailed docs directory |
| `paths.roadmap` | `.ai-factory/ROADMAP.md` | roadmap artifact |
| `paths.research` | `.ai-factory/RESEARCH.md` | persisted exploration context |
| `paths.rules_file` | `.ai-factory/RULES.md` | top-level rules |
| `paths.plan` | `.ai-factory/PLAN.md` | fast plan |
| `paths.plans` | `.ai-factory/plans/` | full plans |
| `paths.fix_plan` | `.ai-factory/FIX_PLAN.md` | fix-plan path |
| `paths.security` | `.ai-factory/SECURITY.md` | security ignore-state artifact |
| `paths.references` | `.ai-factory/references/` | knowledge references |
| `paths.patches` | `.ai-factory/patches/` | bug-fix patches |
| `paths.evolutions` | `.ai-factory/evolutions/` | evolution logs and patch cursor |
| `paths.evolution` | `.ai-factory/evolution/` | Reflex Loop state |
| `paths.specs` | `.ai-factory/specs/` | specs or archived plans |
| `paths.rules` | `.ai-factory/rules/` | area-rule directory |

### `workflow`

| Key | Default | Notes |
| --- | --- | --- |
| `workflow.auto_create_dirs` | `true` | reserved for directory-management behavior |
| `workflow.plan_id_format` | `slug` | reserved for plan naming strategy |
| `workflow.analyze_updates_architecture` | `true` | reserved for setup/update workflow control |
| `workflow.architecture_updates_roadmap` | `true` | reserved for architecture-to-roadmap automation |
| `workflow.verify_mode` | `normal` | default strictness for `/aif-verify` |

### `git`

| Key | Default | Notes |
| --- | --- | --- |
| `git.enabled` | `true` | disables branch/worktree assumptions when false |
| `git.base_branch` | `main` | target branch for diff, review, and merge guidance |
| `git.create_branches` | `true` | allows full plans to create branches automatically |
| `git.branch_prefix` | `feature/` | prefix for auto-created full-plan branches |
| `git.skip_push_after_commit` | `false` | makes `/aif-commit` stop after local commit |

### `rules`

| Key | Default | Notes |
| --- | --- | --- |
| `rules.base` | `.ai-factory/rules/base.md` | base project rule file |
| `rules.<area>` | none | named area-specific rule paths such as `rules.api` |

## Skill matrix

### Config writers

| Skill | Reads config | Writes config | Write scope |
| --- | --- | --- | --- |
| `/aif` | Yes | Yes | creates or refreshes the whole file |
| `/aif-rules` | Yes | Yes, limited | adds or updates `rules.<area>` registrations |

### Config readers

The main config-aware readers are:

- `/aif-architecture`
- `/aif-plan`
- `/aif-explore`
- `/aif-roadmap`
- `/aif-improve`
- `/aif-implement`
- `/aif-verify`
- `/aif-commit`
- `/aif-review`
- `/aif-loop`
- `/aif-docs`
- `/aif-fix`
- `/aif-evolve`
- `/aif-reference`
- `/aif-security-checklist`

### Config-agnostic built-ins

These intentionally do not depend on `config.yaml` right now:

- `/aif-best-practices`
- `/aif-build-automation`
- `/aif-ci`
- `/aif-dockerize`
- `/aif-grounded`
- `/aif-skill-generator`

## Fixed paths outside the current schema

These locations are still fixed by contract and are not configurable via `config.yaml` yet:

| Path | Notes |
| --- | --- |
| `.ai-factory/skill-context/` | built-in skill overrides written by `/aif-evolve` |
| `README.md` | landing page for `/aif-docs` |
| `docs-html/` | static HTML output for `/aif-docs --web` |

## See also

- [Configuration](/essentials/configuration) — high-level config architecture and MCP overview
- [Core Skills](/ai/core-skills) — which commands consume config in practice
- [Development Workflow](/essentials/development-workflow) — where config-aware workflow skills fit end-to-end
