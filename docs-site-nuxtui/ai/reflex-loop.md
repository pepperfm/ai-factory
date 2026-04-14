---
title: Reflex Loop
description: Strict iterative workflow for quality-gated generation.
navigation:
  icon: i-lucide-repeat
---

`/aif-loop` is a strict iterative workflow for quality-gated generation:

1. Generate or refine an artifact
2. Evaluate against explicit rules
3. Critique failed rules
4. Apply minimal corrections
5. Repeat until a stop condition is reached

It is designed for high-signal iteration with minimal storage overhead.

Terminology:

- **loop** = one full execution for a task alias, stored in `run.json` and identified by `run_id`
- **iteration** = one cycle inside that loop

## Command modes

```bash
/aif-loop new <task>
/aif-loop resume [alias]
/aif-loop status
/aif-loop stop [reason]
/aif-loop list
/aif-loop history [alias]
/aif-loop clean [alias|--all]
```

- `new` - start a new loop and initialize loop state
- `resume` - continue the active loop or a loop by alias
- `status` - show current loop progress
- `stop` - explicitly stop the active loop and clear `current.json`
- `list` - list all aliases with status (`running`, `stopped`, `completed`, `failed`)
- `history` - show event history for a loop
- `clean` - remove loop files, but refuses to clean running loops

## Setup confirmation

Before iteration 1, `/aif-loop new` must always ask for explicit confirmation of:

1. Success criteria (rules and thresholds)
2. Max iterations (`run.json.max_iterations`)

The loop must not start until both are confirmed, even if the task text already includes them.

## Persistence model

Four files are used for loop persistence. `current.json` exists only while a loop is active.

```text
.ai-factory/evolution/current.json
.ai-factory/evolution/<task-alias>/run.json
.ai-factory/evolution/<task-alias>/history.jsonl
.ai-factory/evolution/<task-alias>/artifact.md
```

### `current.json`

Pointer to the active loop.

### `run.json`

Single source of truth for current state: phase, iteration, rules, plan, evaluation, critique, score, and stop metadata.

### `history.jsonl`

Append-only event stream. Each line is one JSON event for auditability and resumability.

### `artifact.md`

Single source of truth for the generated artifact. Artifact content is never embedded in `run.json`.

## Phases

Each iteration has 6 phases, with parallel execution where possible:

1. `PLAN` - short iteration plan, usually 3 to 5 steps
2. `PRODUCE` - generate `artifact.md` in parallel with PREPARE
3. `PREPARE` - generate checks or definitions from rules in parallel with PRODUCE
4. `EVALUATE` - run prepared checks and aggregate the score
5. `CRITIQUE` - convert failed rules into exact fix instructions
6. `REFINE` - apply minimal targeted rewrites

### Parallel execution

Two levels of parallelism are built into the design:

- **PRODUCE || PREPARE**: both depend only on PLAN output
- **Within EVALUATE**: independent check groups can run in parallel

If task-style delegation is unavailable, all phases can run sequentially as a fallback.

## Evaluation rules

Rules are stored in `run.json.criteria.rules` and include the full runtime schema: `id`, `description`, `severity`, `weight`, `phase`, and `check`.

### Rule format

```json
{
  "id": "a.correctness.endpoints",
  "description": "All core CRUD endpoints are present",
  "severity": "fail",
  "weight": 2,
  "phase": "A",
  "check": "Verify each endpoint from the task prompt exists"
}
```

### Score formula

```text
score = sum(passed_weights) / sum(all_active_weights)
passed = (score >= threshold) AND (no fail-severity rules failed)
```

Severity levels:

- `fail` — weight `2`, blocks pass
- `warn` — weight `1`, lowers score but does not block alone
- `info` — weight `0`, tracked only

Template rows are shorthand. During setup they are normalized to full runtime rules.

## Iteration flow

1. `PLAN` -> `plan`
2. In parallel: `PRODUCE` -> `artifact.md` and `PREPARE` -> checks
3. `EVALUATE` -> `evaluation`
4. If failed: `CRITIQUE` -> `critique`, then `REFINE` -> updated `artifact.md`
5. If phase A passes: switch to phase B, re-run `PREPARE` and `EVALUATE` against the same artifact
6. Update state, increment iteration, and repeat

### State events

Common events written to `history.jsonl`:

- `run_started`
- `plan_created`
- `artifact_created`
- `checks_prepared`
- `evaluation_done`
- `critique_done`
- `refinement_done`
- `phase_switched`
- `iteration_advanced`
- `phase_error`
- `stopped`
- `failed`

## Stop conditions

The loop stops when any of the following becomes true:

1. `phase=B` and threshold passed (`threshold_reached`)
2. no `fail`-severity rules failed in current evaluation (`no_major_issues`)
3. iteration limit reached (`iteration_limit`)
4. user requested stop (`user_stop`)
5. stagnation detected (`stagnation`)

Default iteration limit is `4` unless explicitly confirmed otherwise.

### Stop reason to status mapping

| Stop reason | `run.json` status |
| --- | --- |
| `threshold_reached` | `completed` |
| `no_major_issues` | `completed` |
| `user_stop` | `stopped` |
| `iteration_limit` | `stopped` |
| `stagnation` | `stopped` |
| `phase_error` | `failed` |

## Final summary contract

After loop termination, always show a final summary with:

1. `iteration` and `max_iterations`
2. `phase`
3. `final_score`
4. `stop_reason`

If stop reason is `iteration_limit` and latest evaluation is still `passed=false`, summary must also include:

1. active threshold versus final score
2. numeric gap to threshold
3. remaining failed `fail`-severity rule count and blocking rule IDs
4. rules progress (`passed_rules / total_rules`)

## Why it works

- **Strict contracts** - each phase has explicit inputs and outputs
- **Minimal state** - only four files are needed for resumability
- **Quality gates** - the loop stops on evidence, not optimism
- **Targeted refinement** - only failed rules generate changes

## See also

- [Development Workflow](/essentials/development-workflow) — where `/aif-loop` fits into the broader flow
- [Core Skills](/ai/core-skills) — command reference for `/aif-loop` and related skills
- [Subagents](/ai/subagents) — the Claude-side agents that map to loop phases
- [Plan Files](/essentials/plan-files) — loop storage and adjacent workflow artifacts
