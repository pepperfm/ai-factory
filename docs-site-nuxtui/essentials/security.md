---
title: Security
description: Two-level scanning to prevent prompt injection in external skills and extensions.
navigation:
  icon: i-lucide-shield-alert
---

**Security is a first-class citizen in AI Factory.** Skills downloaded from external sources such as skills.sh, GitHub, URLs, or extensions can contain prompt injection attacks — malicious instructions hidden inside `SKILL.md` files that hijack agent behavior, steal credentials, or execute destructive commands.

AI Factory protects against this with a mandatory **two-level security scan** before any external skill is used.

## Two-level security scan

::security-split-layout
::

## Why two levels?

| Level | Catches | Misses |
| --- | --- | --- |
| **Python scanner** | Known patterns, encoded payloads, invisible characters, HTML comment injections | Rephrased attacks, novel techniques |
| **LLM semantic review** | Intent and context, creative rephrasing, suspicious tool combinations | Encoded data, zero-width chars, binary payloads |

They complement each other: the scanner is deterministic and catches patterns an LLM may skim past, while the LLM understands intent and catches attacks regex cannot express cleanly.

## What the scanner looks for

- Prompt injection patterns such as fake system-role tags or "ignore previous instructions"
- Data exfiltration attempts such as reading `~/.ssh`, `.env`, or cloud credentials
- Stealth language such as "do not tell the user", "silently", or "secretly"
- Destructive commands such as `rm -rf`, fork bombs, or disk formatting
- Config tampering in agent settings, shell startup files, or git config
- Encoded payloads including base64, hex, and zero-width characters
- Social engineering like fake authority or urgency claims
- Hidden HTML comments with suspicious content

Markdown code blocks are handled with awareness so examples are not treated the same way as executable instructions. In strict mode, that demotion is disabled.

## Scan results

- **CLEAN** (exit `0`) — no threats, safe to install
- **BLOCKED** (exit `1`) — critical threats detected, skill is deleted and user is warned
- **WARNINGS** (exit `2`) — suspicious patterns found, user must explicitly confirm

A skill with **any critical threat is never installed**. No exceptions, no overrides.

## Running the scanner manually

```bash [Terminal]
# Scan a skill directory (use your agent's skills path)
python3 .claude/skills/aif-skill-generator/scripts/security-scan.py ./my-downloaded-skill/

# Strict mode: code-block examples are treated as real threats
python3 .claude/skills/aif-skill-generator/scripts/security-scan.py --strict ./my-downloaded-skill/

# Scan a single SKILL.md file
python3 .claude/skills/aif-skill-generator/scripts/security-scan.py ./my-skill/SKILL.md

# For other agents, adjust the path accordingly:
# python3 .codex/skills/aif-skill-generator/scripts/security-scan.py ./my-skill/
# python3 .agents/skills/aif-skill-generator/scripts/security-scan.py ./my-skill/
```

## Internal self-scan (AI Factory repo)

Built-in AI Factory skills contain security threat examples in their documentation, which can trigger expected false positives. For repository self-audits, use the internal allowlist:

```bash [Terminal]
./scripts/security-self-scan.sh
```

Use `--allowlist` only for trusted first-party content. Do not use it when scanning external downloaded skills.

## See also

- [Core Skills](/ai/core-skills) — `/aif-security-checklist` for project-level security audits
- [Plan Files](/essentials/plan-files) — skill acquisition strategy and how scanning fits in
- [Extensions](/essentials/extensions) — extension installation and trust boundaries
- [Configuration](/essentials/configuration) — MCP servers, paths, and project structure
