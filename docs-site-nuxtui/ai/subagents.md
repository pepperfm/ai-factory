---
title: Subagents
description: Claude-focused bundled agents for planning, implementation, and Reflex Loop execution.
navigation:
  icon: i-lucide-users-round
---

> **Bundled package assets are Claude-only.** AI Factory ships bundled Claude agent files from the package `subagents/` directory and installs them into `.claude/agents/` during `ai-factory init` when Claude Code is selected.

Extensions may also provide agent files for Codex or extension-defined runtimes, but those are configured through extension manifests rather than this bundled package inventory.

## Why this exists

Claude Code has a native subagent system with isolated context, per-agent tool restrictions, model selection, and project-local agent files. AI Factory uses that to:

- split `/aif-loop` into smaller, predictable phase roles
- add planning specialists that critique and refine plans before implementation
- add an implementation coordinator that can dispatch parallel workers safely
- expose background quality sidecars for review, docs drift, and security

The goal is to separate writer roles from judge roles and keep noisy background work out of the main conversation.

## Current scope

Current bundled coverage includes:

- one planning specialist and one planning coordinator
- one implementation coordinator with an isolated worker
- several execution sidecars
- the Reflex Loop agents for planning, production, evaluation, critique, and refinement

Managed copies are installed into `.claude/agents/` and tracked in `.ai-factory.json`.

## Current bundled agents

| Agent | Purpose | Model | Tools |
| --- | --- | --- | --- |
| `plan-coordinator` | iteratively launch `plan-polisher` until a plan passes critique | `inherit` | planning subagent + read tools |
| `plan-polisher` | create or refresh a plan, critique it, and apply one refinement pass | `inherit` | read/write/edit plus repo inspection |
| `implement-coordinator` | parse dependency graph, implement single tasks directly, dispatch parallel workers | `inherit` | workers plus quality sidecars |
| `implement-worker` | isolated worktree worker for one parallel task | `inherit` | read/write/edit plus local checks |
| `best-practices-sidecar` | read-only best-practices review | `inherit` | read-only |
| `commit-preparer` | read-only commit preparation sidecar | `sonnet` | read-only |
| `docs-auditor` | read-only docs drift review | `sonnet` | read-only |
| `review-sidecar` | read-only code review sidecar | `inherit` | read-only |
| `security-sidecar` | read-only security audit sidecar | `inherit` | read-only |
| `loop-orchestrator` | decide the next loop phase from `run.json` | `sonnet` | read-only |
| `loop-planner` | build a short iteration plan | `haiku` | read-only |
| `loop-producer` | generate the current markdown artifact | `inherit` | write |
| `loop-evaluator` | return strict pass/fail JSON against active rules | `inherit` | read-only |
| `loop-critic` | translate failed rules into exact fix instructions | `sonnet` | read-only |
| `loop-refiner` | apply minimal fixes to the artifact | `inherit` | write |
| `loop-test-prep` | prepare lightweight test-oriented checks | `haiku` | read-only |
| `loop-perf-prep` | prepare latency and performance checks | `haiku` | read-only |
| `loop-invariant-prep` | prepare invariant and consistency checks | `haiku` | read-only |

## How `plan-polisher` and `plan-coordinator` fit

`plan-polisher` is a self-contained planning worker. It:

- runs an `/aif-plan`-compatible pass directly inside the agent
- critiques the plan against implementation-readiness criteria
- applies at most one `/aif-improve`-compatible refinement pass
- returns `needs_further_refinement: yes/no`

`plan-coordinator` sits above it and iterates that cycle automatically until the plan passes critique, stagnates, or exhausts its iteration budget.

## How `implement-coordinator` fits

`implement-coordinator` is the execution-side companion. It:

- reads the active plan and builds a dependency graph
- identifies independent task layers
- implements single-task layers directly with sidecar support
- dispatches parallel layers to `implement-worker` in isolated worktrees
- centralizes commits and merge handling

Safety constraints include:

- maximum `4` parallel workers per layer
- immediate stop on merge conflict
- no commits from workers
- stop after repeated layer failure

## Top-level vs ordinary subagents

Two bundled agents are intended to be run as top-level Claude sessions:

| Agent | Why top-level |
| --- | --- |
| `plan-coordinator` | must spawn `plan-polisher` iteratively |
| `implement-coordinator` | must spawn workers and quality sidecars |

Most other agents are ordinary subagents and do not benefit from top-level execution.

## Quick start

### Full workflow

```bash [Terminal]
# Step 1: polish the plan
claude --agent plan-coordinator "implement user authentication with JWT"

# Step 2: implement it
claude --agent implement-coordinator
```

### Plan only

```bash [Terminal]
claude --agent plan-coordinator "implement user authentication with JWT"
claude --agent plan-coordinator "@.ai-factory/plans/feature-auth.md"
```

### Implement only

```bash [Terminal]
claude --agent implement-coordinator
claude --agent implement-coordinator "@.ai-factory/plans/feature-auth.md"
```

For simple single-task work inside a normal Claude Code session, `/aif-implement` is still the simpler path.

## See also

- [Reflex Loop](/ai/reflex-loop) — the loop phases these agents support
- [Core Skills](/ai/core-skills) — command-layer view of the same workflows
- [Extensions](/essentials/extensions) — third-party agent files and runtime definitions
