---
title: Introduction
description: What AI Factory is, what it installs, and which agents it supports.
navigation:
  icon: i-lucide-house
---

## What is AI Factory?

AI Factory is a stack-agnostic CLI tool and skill system that works with any language, framework, or platform:

1. **Analyzes your project** — understands your codebase structure and conventions
2. **Installs relevant skills** — downloads from [skills.sh](https://skills.sh) or generates custom ones
3. **Configures MCP servers** — GitHub, Postgres, Filesystem, Chrome Devtools, and Playwright based on your needs
4. **Provides spec-driven workflow** — structured feature development with plans, tasks, commits, verification, and evolution

## What you get

- **Zero configuration**: installs relevant skills and configures integrations for you.
- **Best practices built in**: logging, commits, review, security checks, and docs checkpoints are part of the default flow.
- **Spec-driven development**: plan first, then implement. Predictable, resumable, and reviewable.
- **Skills ecosystem**: use community skills from skills.sh or generate your own.
- **Works with your stack**: any language, framework, or platform.
- **Multi-agent support**: works across major AI coding agents and CLIs.

## Supported agents

AI Factory works with any AI coding agent. During `ai-factory init`, you choose one or more target agents and skills are installed to each agent's correct directory with paths adapted automatically.

| Agent | Config directory | Skills directory |
| --- | --- | --- |
| Claude Code | `.claude/` | `.claude/skills/` |
| Cursor | `.cursor/` | `.cursor/skills/` |
| Windsurf | `.windsurf/` | `.windsurf/skills/` |
| Roo Code | `.roo/` | `.roo/skills/` |
| Kilo Code | `.kilocode/` | `.kilocode/skills/`, `.kilocode/workflows/` |
| Antigravity | `.agent/` | `.agent/skills/`, `.agent/workflows/` |
| OpenCode | `.opencode/` | `.opencode/skills/` |
| Warp | `.warp/` | `.warp/skills/` |
| Zencoder | `.zencoder/` | `.zencoder/skills/` |
| Codex CLI | `.codex/` | `.codex/skills/` |
| GitHub Copilot | `.github/` | `.github/skills/` |
| Gemini CLI | `.gemini/` | `.gemini/skills/` |
| Junie | `.junie/` | `.junie/skills/` |
| Qwen Code | `.qwen/` | `.qwen/skills/` |
| Universal / Other | `.agents/` | `.agents/skills/` |

When Claude Code is selected, AI Factory also installs bundled agent files into `.claude/agents/` and tracks them in `.ai-factory.json` with universal `agentsDir`, `installedAgentFiles`, and `managedAgentFiles` fields.

MCP server configuration is supported for Claude Code, Cursor, GitHub Copilot, Roo Code, Kilo Code, OpenCode, and Qwen Code. Other agents get skills installed with correct paths but without MCP auto-configuration.

## Your first project

```bash [Terminal]
# 1. Install AI Factory
npm install -g ai-factory

# 2. Go to your project
cd my-project

# 3. Initialize — pick agents, install skills, configure MCP
ai-factory init
# Or non-interactively:
# ai-factory init --agents claude,codex --mcp playwright,github

# 4. Open your AI agent (Claude Code, Cursor, etc.) and run:
/aif

# 5. Optional discovery before planning
/aif-explore Add user authentication with OAuth

# 6. Start building
/aif-plan Add user authentication with OAuth
```

If scope is unclear, start with `/aif-explore`. If the task is clear but the answer must be strictly verified, use `/aif-grounded`. If the direction is already clear, jump straight to `/aif-plan`.

## CLI commands

```bash [Terminal]
# Initialize project (interactive wizard)
ai-factory init

# Initialize non-interactively with flags
ai-factory init --agents claude,codex --mcp playwright,github
ai-factory init --agents cursor --skills commit,plan
ai-factory init --agents claude --no-skills --mcp github

# Update skills to latest version (also checks for CLI updates)
ai-factory update

# Force clean reinstall of currently installed base skills
ai-factory update --force

# Migrate existing skills from v1 naming to v2 naming
ai-factory upgrade

# Install, list, update, or remove extensions
ai-factory extension add ./my-extension
ai-factory extension list
ai-factory extension update
ai-factory extension update my-extension --force
ai-factory extension remove my-extension
```

## Where to go next

- [Installation](/getting-started/installation) - install and run the init command
- [Usage](/getting-started/usage) - CLI flags, core commands, and example workflow
- [Development Workflow](/essentials/development-workflow) - understand the full flow from discovery to commit
- [Reflex Loop](/ai/reflex-loop) - run iterative generate -> evaluate -> critique -> refine cycles
- [Core Skills](/ai/core-skills) - all available slash commands
- [Configuration](/essentials/configuration) - customize `.ai-factory.json`, `config.yaml`, MCP, and project paths
