---
title: Plan Files
description: How plans, research, patches, and skill-context are stored.
navigation:
  icon: i-lucide-list-checks
---

AI Factory uses markdown and JSON artifacts as the source of truth for planning, execution, learning, and iteration.

## Plan file locations

| Source | Plan file | After completion |
| --- | --- | --- |
| `/aif-plan fast` | `paths.plan` (default: `.ai-factory/PLAN.md`) | Offer to delete |
| `/aif-plan full` | `paths.plans/<branch-or-slug>.md` | Keep (user decides) |

## Artifact ownership quick map

To avoid ownership conflicts, AI Factory treats artifacts as command-scoped.

| Artifact | Primary owner command | Notes |
| --- | --- | --- |
| `.ai-factory/DESCRIPTION.md` | `/aif` | `/aif-implement` may update only when implementation context truly changed |
| `.ai-factory/ARCHITECTURE.md` | `/aif-architecture` | `/aif-implement` may update structure notes when code structure changed |
| `.ai-factory/ROADMAP.md` | `/aif-roadmap` | `/aif-implement` may mark milestones complete with evidence |
| `paths.rules_file` and `rules.<area>` | `/aif-rules` | top-level axioms plus area-specific conventions |
| `.ai-factory/RESEARCH.md` | `/aif-explore` | persisted exploration artifact |
| `paths.plan` and `paths.plans/<branch-or-slug>.md` | `/aif-plan` | `/aif-improve` refines existing plans |
| `paths.fix_plan` and `paths.patches/*.md` | `/aif-fix` | fix plans plus self-improvement patches |
| `.ai-factory/skill-context/*` | `/aif-evolve` | project-specific skill overrides derived from patches |
| `paths.evolutions/*.md` and `patch-cursor.json` | `/aif-evolve` | evolution logs and incremental cursor |

Quality commands such as `/aif-commit`, `/aif-review`, and `/aif-verify` treat these artifacts as read-only context by default.

## Research file (optional)

`.ai-factory/RESEARCH.md` is a persisted exploration artifact. Use it to capture constraints, decisions, and open questions during `/aif-explore` so you can `/clear` and still feed the same context into `/aif-plan`.

Typical structure:

- `## Active Summary (input for /aif-plan)` — compact, current snapshot
- `## Sessions` — append-only history of exploration notes

## Roadmap linkage (optional)

If `.ai-factory/ROADMAP.md` exists, `/aif-plan` may include a `## Roadmap Linkage` section in the plan file. This makes milestone alignment explicit for `/aif-implement` completion marking and `/aif-verify` roadmap gates.

### Example plan file

```md
# Implementation Plan: User Authentication

Branch: feature/user-authentication
Created: 2026-02-18

## Settings
- Testing: no
- Logging: verbose
- Docs: yes          # /aif-implement routes docs updates through /aif-docs

## Research Context (optional)
Source: .ai-factory/RESEARCH.md (Active Summary)
Goal: Add OAuth + email login
Constraints: Must support existing session middleware
Decisions: Use JWT for API auth
Open questions: Do we need refresh tokens?

## Commit Plan
- **Commit 1** (tasks 1-3): "feat: add user model and types"
- **Commit 2** (tasks 4-6): "feat: implement auth service"

## Tasks

### Phase 1: Setup
- [ ] Task 1: Create User model
- [ ] Task 2: Add auth types

### Phase 2: Implementation
- [x] Task 3: Implement registration
- [ ] Task 4: Implement login
```

## Self-improvement patches

AI Factory has a built-in learning loop. Every bug fix creates a **patch** — a structured knowledge artifact that helps AI avoid the same mistakes in the future.

```text
/aif-fix -> finds bug -> fixes it -> creates patch -> /aif-evolve distills new patches into skill-context -> smarter future runs
```

How it works:

1. `/aif-fix` fixes a bug and creates a patch file in `paths.patches/YYYY-MM-DD-HH.mm.md`
2. Each patch documents: **Problem**, **Root Cause**, **Solution**, **Prevention**, and **Tags**
3. `/aif-evolve` reads patches incrementally using `paths.evolutions/patch-cursor.json`
4. Workflow skills prefer skill-context rules and use only limited recent patch fallback when needed

### Example patch

```md
# Null reference in UserProfile when user has no avatar

**Date:** 2026-02-07 14:30
**Files:** src/components/UserProfile.tsx
**Severity:** medium

## Problem
TypeError: Cannot read property 'url' of undefined when rendering UserProfile.

## Root Cause
`user.avatar` is optional in DB but accessed without null check.

## Solution
Added optional chaining: `user.avatar?.url` with fallback.

## Prevention
- Always null-check optional DB fields in UI
- Add "empty state" test cases

## Tags
`#null-check` `#react` `#optional-field`
```

## Skill-context

Built-in `aif-*` skills are overwritten on update, so AI Factory keeps project-specific rule overrides in a separate fixed location:

```text
.ai-factory/skill-context/<skill-name>/SKILL.md
```

Key properties:

- **Survives `ai-factory update`** — lives in the project, not in the package
- **Higher priority than base rules** — project-specific context wins when rules conflict
- **Cumulative** — `/aif-evolve` adds, updates, and removes rules over time

This closes the longer learning loop: **fix -> patch -> evolve -> skill-context -> better future runs**.

## Skill acquisition strategy

AI Factory follows this strategy for external skills:

```text
For each recommended skill:
  1. Search skills.sh: npx skills search <name>
  2. If found -> Install: npx skills install --agent <agent> <name>
  3. Security scan -> python3 security-scan.py <path>
     - BLOCKED? -> remove, warn user, skip
     - WARNINGS? -> show to user, ask confirmation
  4. If not found -> Generate: /aif-skill-generator <name>
  5. Has reference docs? -> Learn: /aif-skill-generator <url1> [url2]...
```

Never reinvent existing skills if a vetted one already exists. Never trust external skills blindly. Security scan them first.

## See also

- [Development Workflow](/essentials/development-workflow) — how plan files fit into the development loop
- [Core Skills](/ai/core-skills) — full reference for `/aif-fix`, `/aif-evolve`, and related commands
- [Skill Evolution](/ai/skill-evolution) — how patches become project-specific skill rules
- [Security](/essentials/security) — how external skills are scanned before use
