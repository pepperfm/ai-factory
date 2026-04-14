---
title: Development Workflow
description: The end-to-end flow from setup to planning, implementation, verification, and evolution.
navigation:
  icon: i-lucide-git-branch
---

AI Factory has two phases: **configuration** (one-time project setup) and the **development workflow** (repeatable loop of explore -> plan -> improve -> implement -> verify -> commit -> evolve).

## Phase 1: Project configuration (one-time)

Run once per project. Sets up context files that all workflow skills depend on.

::project-config-flow
::

Typical setup sequence:

```text
ai-factory init
/aif
/aif-architecture
/aif-rules        # optional
/aif-roadmap      # recommended
/aif-docs         # optional
/aif-ci           # optional
```

## Phase 2: Development workflow (repeatable)

The loop is predictable and resumable. Use discovery when the problem is still fuzzy, use grounded mode when certainty matters, then move through planning and execution.

![workflow](/workflow.webp)

::workflow-flowchart
::

### Typical flow

```text
/aif-explore Add OAuth login
/aif-grounded Does this repo already support OAuth providers?
/aif-plan full Add OAuth login
/aif-improve
/aif-implement
/aif-verify
/aif-commit
/aif-evolve
```

## When to use what

| Command | Use case | Creates branch? | Creates plan or artifact? |
| --- | --- | --- | --- |
| `/aif-roadmap` | Strategic planning, milestones, long-term vision | No | `.ai-factory/ROADMAP.md` |
| `/aif-explore` | Investigate options, constraints, and trade-offs before planning | No | Optional `RESEARCH.md` |
| `/aif-grounded` | Evidence-only answers, version-sensitive or high-stakes questions | No | No |
| `/aif-plan fast` | Small tasks, quick fixes, experiments | No | `.ai-factory/PLAN.md` |
| `/aif-plan full` | Full features, stories, epics | Optional, config-driven | `.ai-factory/plans/<branch-or-slug>.md` |
| `/aif-plan full --parallel` | Concurrent features via worktrees | Yes + worktree | Full plan + isolated workspace |
| `/aif-improve` | Refine an existing plan before implementation | No | No (improves existing) |
| `/aif-loop` | Strict iterative generation with quality gates and phase-based cycles | No | `.ai-factory/evolution/` state |
| `/aif-fix` | Bug fixes, errors, hotfixes | No | Optional `.ai-factory/FIX_PLAN.md` + patches |
| `/aif-verify` | Post-implementation completeness and quality check | No | No (reads existing) |

## Workflow Skills

These skills form the development pipeline. Each one feeds into the next.

### `/aif-roadmap [check | vision]` — strategic planning

```text
/aif-roadmap
/aif-roadmap SaaS for project management
/aif-roadmap check
```

Creates or updates `.ai-factory/ROADMAP.md` and keeps milestone-level project direction explicit. Use `check` to auto-scan the codebase and confirm milestones that appear done.

### `/aif-explore [topic or plan name]` — explore before planning

```text
/aif-explore real-time collaboration
/aif-explore the auth system is getting unwieldy
/aif-explore add-auth-system
```

Thinking-partner mode for open questions, option mapping, and trade-offs. Best when requirements are unclear and you want exploration without committing to implementation yet. Exploration can optionally be saved to `RESEARCH.md` so it survives `/clear` and feeds into planning.

### `/aif-grounded <question or task>` — reliability gate

```text
/aif-grounded Explain how feature flags work in this codebase
/aif-grounded Update dependencies to the latest secure versions
```

Use when the task is already clear but the answer must be evidence-only. If confidence is not 100 out of 100 based on repository evidence, command output, or provided docs, the skill returns `INSUFFICIENT INFORMATION` instead of guessing.

### `/aif-plan [fast|full] <description>` — plan the work

```text
/aif-plan Add user authentication with OAuth
/aif-plan fast Add product search API
/aif-plan full Add user authentication with OAuth
/aif-plan full --parallel Add Stripe checkout
```

Two modes — **fast** (no branch, stores plan in `.ai-factory/PLAN.md`) and **full** (stores in `.ai-factory/plans/<branch-or-slug>.md` and creates a git branch only when git settings allow it). Explores the codebase, creates ordered tasks with dependencies, and adds commit checkpoints for larger plans.

### `/aif-improve [prompt]` — refine the plan

```text
/aif-improve
/aif-improve add validation and error handling
```

Second-pass analysis. Finds missing tasks, fixes dependencies, removes redundant work, and shows an improvement report before applying changes.

### `/aif-loop [new|resume|status|stop|list|history|clean]` — strict Reflex Loop

```text
/aif-loop new OpenAPI 3.1 + DDD notes + JSON examples + PHP controller
/aif-loop resume
/aif-loop status
/aif-loop list
```

Runs a strict loop with 6 phases: `PLAN -> PRODUCE||PREPARE -> EVALUATE -> CRITIQUE -> REFINE`. Uses threshold-based scoring, persists state in `.ai-factory/evolution/`, and stops on threshold reached, no major issues, stagnation, user stop, or max iterations.

For full contracts and stop rules, see [Reflex Loop](/ai/reflex-loop).

### `/aif-implement` — execute the plan

```text
/aif-implement
/aif-implement 5
/aif-implement status
```

Executes plan tasks one by one, reads skill-context first, uses limited recent patch fallback when needed, and routes documentation updates through `/aif-docs` when the plan says `Docs: yes`.

### `/aif-verify [--strict]` — check completeness

```text
/aif-verify
/aif-verify --strict
```

Optional step after `/aif-implement`. Audits task completion, runs build and test checks, scans for TODO drift and undocumented env vars, and suggests `/aif-security-checklist`, `/aif-review`, then `/aif-commit` when the result is green.

### `/aif-fix [bug description]` — fix and learn

```text
/aif-fix TypeError: Cannot read property 'name' of undefined
```

Two modes:
- **Fix now** — investigates and fixes immediately with logging
- **Plan first** — creates `.ai-factory/FIX_PLAN.md` with analysis and fix steps, then stops for review

Every fix creates a self-improvement patch in `.ai-factory/patches/`. Those patches later feed `/aif-evolve`.

### `/aif-evolve` — improve skills from experience

```text
/aif-evolve
/aif-evolve fix
```

Reads accumulated patches, project conventions, and skill-context, then proposes targeted improvements that make future runs smarter and more project-specific.

---

For the detailed command reference, see [Core Skills](/ai/core-skills).

## Why spec-driven?

- **Predictable results** - AI follows a plan instead of random exploration
- **Resumable sessions** - progress is stored in plan and loop artifacts
- **Commit discipline** - structured checkpoints instead of ad-hoc diffs
- **Evidence gates where needed** - use `/aif-grounded` when guessing is unacceptable
- **Learning over time** - fixes become patches, patches become skill-context

## See also

- [Reflex Loop](/ai/reflex-loop) — strict iterative loop contracts and state transitions
- [Core Skills](/ai/core-skills) — detailed reference for workflow and utility skills
- [Plan Files](/essentials/plan-files) — plans, research artifacts, patches, and skill-context
