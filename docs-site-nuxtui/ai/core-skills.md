---
title: Core Skills
description: The command set that powers AI Factory workflows.
navigation:
  icon: i-lucide-command
---

**Config-aware skills read `.ai-factory/config.yaml` at startup** to resolve paths, language settings, workflow preferences, and rules hierarchy.

Current config-aware built-ins include `/aif`, `/aif-plan`, `/aif-implement`, `/aif-verify`, `/aif-commit`, `/aif-review`, `/aif-roadmap`, `/aif-explore`, `/aif-loop`, `/aif-rules`, `/aif-architecture`, `/aif-docs`, `/aif-fix`, `/aif-improve`, `/aif-evolve`, `/aif-reference`, and `/aif-security-checklist`.

Current config-agnostic built-ins include `/aif-best-practices`, `/aif-build-automation`, `/aif-ci`, `/aif-dockerize`, `/aif-grounded`, and `/aif-skill-generator`.

## Workflow Skills

These skills form the core development loop. See [Development Workflow](/essentials/development-workflow) for the full diagram and how they connect.

### `/aif-explore [topic or plan name]`

Explore ideas, constraints, and trade-offs before planning:

```text
/aif-explore real-time collaboration
/aif-explore the auth system is getting unwieldy
/aif-explore add-auth-system
```

- Uses a thinking-partner mode for open questions, option mapping, and ASCII visualization
- Reads project context from description, architecture, rules, research artifacts, and active plans when present
- Does **not** implement code in this mode
- Can optionally persist results to `.ai-factory/RESEARCH.md`
- Best when the problem is still fuzzy and you need direction before planning

### `/aif-plan [fast|full] <description>`

Plans implementation for a feature or task:

```text
/aif-plan Add user authentication with OAuth
/aif-plan fast Add product search API
/aif-plan full Add user authentication with OAuth
```

Two modes:

- **Fast** — no git branch, saves to `paths.plan` (default: `.ai-factory/PLAN.md`)
- **Full** — saves to `paths.plans/<branch-or-slug>.md` and creates a git branch only when git settings allow it

Both modes explore the codebase for patterns, create ordered tasks with dependencies, and include commit checkpoints for larger plans.

**Parallel mode** — work on multiple features simultaneously using `git worktree`:

```text
/aif-plan full --parallel Add Stripe checkout
```

- Creates a separate working directory
- Copies AI context files
- Keeps concurrent feature work isolated

**Manage parallel features:**

```text
/aif-plan --list
/aif-plan --cleanup feature/stripe-checkout
```

### `/aif-roadmap [check | vision or requirements]`

Creates or updates a strategic project roadmap:

```text
/aif-roadmap
/aif-roadmap SaaS for project management
/aif-roadmap check
```

- Reads the resolved description and architecture artifacts for context
- Generates or updates `.ai-factory/ROADMAP.md`
- `check` mode scans the codebase for milestone evidence and suggests status updates
- `/aif-implement` can mark roadmap milestones complete when work finishes

### `/aif-improve [--list] [@plan-file] [prompt]`

Refines an existing plan with a second iteration:

```text
/aif-improve
/aif-improve --list
/aif-improve @my-custom-plan.md
/aif-improve add validation and error handling
```

- Locates the active plan or accepts an explicit plan path
- Performs deeper codebase analysis than the initial `/aif-plan`
- Finds missing tasks, fixes dependencies, removes redundant work
- Shows an improvement report and asks for approval before applying changes

### `/aif-loop [new|resume|status|stop|list|history|clean] [task or alias]`

Runs a strict iterative Reflex Loop with quality gates:

```text
/aif-loop new OpenAPI 3.1 spec + DDD notes + JSON examples
/aif-loop resume
/aif-loop status
/aif-loop stop
/aif-loop list
/aif-loop history courses-api-ddd
/aif-loop clean courses-api-ddd
```

- Uses 6 phases: `PLAN -> PRODUCE||PREPARE -> EVALUATE -> CRITIQUE -> REFINE`
- Persists state in `.ai-factory/evolution/`
- Uses thresholds, rule severities, and explicit stop conditions
- Requires explicit confirmation of success criteria and max iterations before iteration 1

Full protocol and schemas: [Reflex Loop](/ai/reflex-loop)

### `/aif-implement`

Executes the plan:

```text
/aif-implement
/aif-implement --list
/aif-implement @my-custom-plan.md
/aif-implement 5
/aif-implement status
```

- Reads skill-context first and uses limited recent patch fallback only when needed
- Finds the appropriate plan file automatically or accepts an explicit one
- Executes tasks one by one
- Prompts for commits at checkpoints
- Routes docs updates through `/aif-docs` when the plan says `Docs: yes`

### `/aif-verify [--strict]`

Verifies completed implementation against the plan:

```text
/aif-verify
/aif-verify --strict
```

- Audits every task in the plan and reports `COMPLETE`, `PARTIAL`, or `NOT FOUND`
- Runs build, test, and lint checks
- Scans for TODO drift, undocumented env vars, and naming mismatches
- Uses context gates for architecture, roadmap, and rules alignment
- Recommends `/aif-fix <issue summary>` first when problems are found

### `/aif-fix [bug description]`

Bug fix with optional plan-first mode:

```text
/aif-fix TypeError: Cannot read property 'name' of undefined
```

- Choose **Fix now** or **Plan first**
- Investigates root cause, applies fix with logging, and suggests tests
- Creates a self-improvement patch in `paths.patches`
- Plan-first mode writes `paths.fix_plan` and stops for review

### `/aif-evolve [skill-name|"all"]`

Self-improves skills based on project experience:

```text
/aif-evolve
/aif-evolve fix
/aif-evolve all
```

- Reads patches incrementally from `paths.patches`
- Analyzes conventions, recurring bugs, and current skill-context
- Writes project-specific overrides to `.ai-factory/skill-context/<skill>/SKILL.md`
- Saves evolution logs to `paths.evolutions`

---

## Utility Skills

### `/aif`

Analyzes your project and sets up context:

- Scans project files to understand the codebase
- Searches [skills.sh](https://skills.sh) for relevant skills
- Generates custom skills via `/aif-skill-generator`
- Configures MCP servers
- Generates architecture guidance via `/aif-architecture`

When called with a description:

```text
/aif project management tool with GitHub integration
```

It creates the description and architecture artifacts but does **not** implement the project.

### `/aif-grounded <question or task>`

Reliability gate that prevents guessing:

```text
/aif-grounded Explain how feature flags work in this codebase
/aif-grounded Update dependencies to the latest secure versions
```

- Returns a final answer only when confidence is `100/100` based on evidence
- Otherwise returns `INSUFFICIENT INFORMATION` with a concrete checklist
- Best for high-stakes, changeable, or version-sensitive questions

### `/aif-architecture [clean|ddd|microservices|monolith|layers]`

Generates architecture guidelines tailored to your project:

```text
/aif-architecture
/aif-architecture clean
/aif-architecture monolith
```

Reads project context, recommends an architecture style, and writes `.ai-factory/ARCHITECTURE.md` with structure, dependency rules, and examples.

### `/aif-docs [--web]`

Generates and maintains project documentation:

```text
/aif-docs
/aif-docs --web
```

- Creates or improves README plus structured docs pages
- Consolidates scattered markdown files into a coherent docs tree
- Integrates with `/aif-implement` docs policy
- `--web` generates a static docs site

### `/aif-reference <url...>`

Creates project-local reference material from external documentation:

```text
/aif-reference https://docs.example.com/api-reference --name example-api
```

- Pulls in external docs AI may not know well
- Stores normalized reference material in the project
- Useful before planning or implementation when external APIs matter

### `/aif-dockerize [--audit]`

Generates, enhances, or audits Docker configuration:

```text
/aif-dockerize
/aif-dockerize --audit
```

Supports generate, enhance, and audit modes depending on the current repository state.

### `/aif-build-automation [makefile|taskfile|justfile|mage]`

Generates or enhances build automation files:

```text
/aif-build-automation
/aif-build-automation makefile
/aif-build-automation taskfile
```

Adapts to the detected language, framework, package manager, Docker setup, and existing build tooling.

### `/aif-ci [github|gitlab] [--enhance]`

Generates, enhances, or audits CI/CD pipeline configuration:

```text
/aif-ci
/aif-ci github
/aif-ci gitlab
/aif-ci --enhance
```

Built-in best practices include concurrency control, explicit permissions, dependency caching, security jobs, and language-specific lint/test/build steps.

### `/aif-rules [rule text]`

Adds project-specific rules and conventions:

```text
/aif-rules Always use DTO instead of arrays
/aif-rules
```

Stores project-wide axioms and area-specific rules that downstream workflow commands consume.

### `/aif-commit`

Creates conventional commits:

- Analyzes staged changes
- Generates a meaningful commit message
- Follows conventional commit format

### `/aif-skill-generator`

Generates new skills or learns from documentation:

```text
/aif-skill-generator api-patterns
/aif-skill-generator https://fastapi.tiangolo.com/tutorial/
```

Can synthesize a skill from one or more documentation sources and package it with references, scripts, and templates.

### `/aif-security-checklist [category]`

Security audit based on OWASP Top 10 and project best practices:

```text
/aif-security-checklist
/aif-security-checklist auth
/aif-security-checklist prompt-injection
```

Supports category-based audits and explicit ignore tracking in `.ai-factory/SECURITY.md`.

## See also

- [Development Workflow](/essentials/development-workflow) — how workflow skills connect end-to-end
- [Reflex Loop](/ai/reflex-loop) — strict loop protocol for iterative quality gating
- [Skill Evolution](/ai/skill-evolution) — how `/aif-evolve` writes skill-context
- [Subagents](/ai/subagents) — Claude-oriented planning and execution agents
- [Plan Files](/essentials/plan-files) — where workflow artifacts are stored
