---
title: Installation
description: Install AI Factory, run init, and bootstrap your first workflow.
navigation:
  icon: i-lucide-download
---

## Install

<!-- AIF:CUSTOM:START install-code-group -->

<code-group>

```bash [bun]
bun add -g ai-factory
```

```bash [pnpm]
pnpm add -g ai-factory
```

```bash [yarn]
yarn global add ai-factory
```

```bash [npm]
npm i -g ai-factory
```

```bash [mise]
mise use -g npm:ai-factory
```

</code-group>

<!-- AIF:CUSTOM:END install-code-group -->

## Quick start

<!-- AIF:CUSTOM:START quick-start-hint -->

<div class="code-group__hint">In your project directory</div>

<!-- AIF:CUSTOM:END quick-start-hint -->

```bash [Terminal]
ai-factory init
```

Or run the wizard non-interactively:

```bash [Terminal]
ai-factory init --agents claude,codex --mcp playwright,github
```

This will:

- Ask which AI agent you use, or use `--agents`
- Install relevant skills, or use `--skills`
- Configure MCP servers, or use `--mcp`
- Create the base AI Factory context for the project

## Your first project

### 1. Install AI Factory

<!-- AIF:CUSTOM:START first-project-install-code-group -->

<code-group>

```bash [bun]
bun add -g ai-factory
```

```bash [pnpm]
pnpm add -g ai-factory
```

```bash [yarn]
yarn global add ai-factory
```

```bash [npm]
npm i -g ai-factory
```

```bash [mise]
mise use -g npm:ai-factory
```

</code-group>

<!-- AIF:CUSTOM:END first-project-install-code-group -->

### 2. Go to your project

```bash [Terminal]
cd my-project
```

### 3. Initialize AI Factory

```bash [Terminal]
ai-factory init
# Or: ai-factory init --agents claude --mcp github,playwright
```

Then open your AI agent and run:

```text
/aif
```

From there you can explore, plan, and implement:

```text
/aif-explore Add user authentication with OAuth
/aif-plan Add user authentication with OAuth
/aif-implement
```

## Run without installation

<!-- AIF:CUSTOM:START run-without-installation-code-group -->

<div class="code-group__hint">One-off execution</div>

<code-group>

```bash [bun]
bunx ai-factory init
```

```bash [pnpm]
pnpm dlx ai-factory init
```

```bash [yarn]
yarn dlx ai-factory init
```

```bash [npm]
npx ai-factory init
```

```bash [mise]
mise x npm:ai-factory -- ai-factory init
```

</code-group>

<!-- AIF:CUSTOM:END run-without-installation-code-group -->

## Upgrade from v1 to v2

```bash [Terminal]
ai-factory upgrade
```

`ai-factory upgrade` removes old bare-named skills such as `commit` and `feature` and installs the newer `aif-*` command set. Custom skills are preserved.
