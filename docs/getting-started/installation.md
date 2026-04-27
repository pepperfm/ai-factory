# Installation

## Install

### bun

```bash
bun add -g ai-factory
```

### pnpm

```bash
pnpm add -g ai-factory
```

### yarn

```bash
yarn global add ai-factory
```

### npm

```bash
npm i -g ai-factory
```

### mise

```bash
mise use -g npm:ai-factory
```

## Quick Start

In your project directory:

```bash
ai-factory init
```

Or run the wizard non-interactively:

```bash
ai-factory init --agents claude,codex --mcp playwright,github
```

This will:

- Ask which AI agent you use, or use `--agents`
- Install relevant skills, or use `--skills`
- Configure MCP servers, or use `--mcp`
- Create the base AI Factory context for the project

## Your First Project

### 1. Install AI Factory

Use one of the install commands above.

### 2. Go to your project

```bash
cd my-project
```

### 3. Initialize AI Factory

```bash
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

## Run Without Installation

### bun

```bash
bunx ai-factory init
```

### pnpm

```bash
pnpm dlx ai-factory init
```

### yarn

```bash
yarn dlx ai-factory init
```

### npm

```bash
npx ai-factory init
```

### mise

```bash
mise x npm:ai-factory -- ai-factory init
```

## Upgrade from v1 to v2

```bash
ai-factory upgrade
```

`ai-factory upgrade` removes old bare-named skills such as `commit` and `feature` and installs the newer `aif-*` command set. Custom skills are preserved.
