import { SpecCompliantTransformer } from './spec-compliant.js';

export class KiloCodeTransformer extends SpecCompliantTransformer {
  getWelcomeMessage(): string[] {
    return [
      '1. Open Kilo Code in this directory',
      '2. Skills installed to .kilocode/skills/ (directory names use hyphens, not dots)',
      '3. MCP servers configured in .kilocode/mcp.json (if selected)',
      '4. Run /ai-factory to analyze project and generate stack-specific skills',
    ];
  }
}
