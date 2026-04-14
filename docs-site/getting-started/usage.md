# Usage

After running `ai-factory init`, open your AI agent and start with:

```text
/aif
```

This sets up the working context and makes all AI Factory commands available.

## CLI Commands

```bash
# Initialize project (interactive wizard)
ai-factory init

# Initialize non-interactively with flags
ai-factory init --agents claude,codex --mcp playwright,github
ai-factory init --agents cursor --skills commit,plan
ai-factory init --agents claude --no-skills --mcp github

# Update skills to the latest version (also checks for CLI updates)
ai-factory update

# Force a clean reinstall of currently installed base skills
ai-factory update --force

# Upgrade from v1 to v2 (renames old bare-named skills)
ai-factory upgrade

# Manage extensions
ai-factory extension add ./my-extension
ai-factory extension list
ai-factory extension update
ai-factory extension remove my-extension
```

## Example Workflow

```text
# Explore options and constraints before planning (optional)
/aif-explore Add user authentication with OAuth

# Need a strictly verified answer before changing anything?
/aif-grounded Does this repo already support OAuth providers?

# Plan a feature
/aif-plan Add user authentication with OAuth

# Optionally refine the plan with deeper analysis
/aif-improve

# Execute the plan task by task
/aif-implement

# Create a knowledge reference from external docs
/aif-reference https://docs.example.com/api-reference --name example-api

# Fix a bug and turn it into future guidance
/aif-fix TypeError: Cannot read property 'name' of undefined

# Set up CI pipeline
/aif-ci github

# Generate or update project documentation
/aif-docs
```

## Non-Interactive Mode

Pass `--agents` to skip the interactive wizard:

```bash
# Agents + MCP servers
ai-factory init --agents claude,cursor --mcp github,playwright

# With specific skills
ai-factory init --agents claude --skills commit,plan

# Without base skills
ai-factory init --agents codex --no-skills --mcp github
```

Available MCP servers include `github`, `postgres`, `filesystem`, `chrome-devtools`, and `playwright`.

## Auto-Generated Documentation

AI Factory can generate and maintain your project docs with a single command:

```text
/aif-docs          # Creates README + docs/ structure from your codebase
/aif-docs --web    # Also generates a static HTML documentation site
```

- **Generates docs from scratch** — analyzes your codebase and creates a lean README plus detailed `docs/` pages by topic
- **Cleans up scattered files** — consolidates loose markdown files from the project root into a structured docs tree
- **Keeps docs in sync** — integrates with `/aif-implement` docs policy so docs stay aligned with the code
- **Builds a docs website** — `--web` generates a static site with navigation and clean typography

## See Also

- [Development Workflow](../essentials/development-workflow.md) — understand the full flow from discovery to commit
- [Reflex Loop](../ai/reflex-loop.md) — run iterative generate → evaluate → critique → refine cycles
- [Core Skills](../ai/core-skills.md) — all workflow and utility commands
- [Plan Files](../essentials/plan-files.md) — plan files, research artifacts, patches, and skill-context
- [Security](../essentials/security.md) — two-level security scanning for external skills
- [Configuration](../essentials/configuration.md) — customize `.ai-factory.json`, `config.yaml`, and MCP servers
