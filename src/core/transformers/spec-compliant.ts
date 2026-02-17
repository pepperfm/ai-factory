import type { AgentTransformer, TransformResult } from '../transformer.js';
import { sanitizeName, extractFrontmatterName, replaceFrontmatterName } from '../transformer.js';

/**
 * Transformer that enforces Agent Skills spec naming rules:
 * - Skill names must be lowercase alphanumeric with hyphens
 * - Dots in names are replaced with hyphens (e.g. ai-factory.feature → ai-factory-feature)
 *
 * Used by agents that strictly validate skill names against the spec.
 */
export class SpecCompliantTransformer implements AgentTransformer {
  transform(skillName: string, content: string): TransformResult {
    const name = extractFrontmatterName(content);
    const sanitized = name ? sanitizeName(name) : skillName;
    const newContent = name ? replaceFrontmatterName(content, sanitized) : content;

    return {
      targetDir: sanitized,
      targetName: 'SKILL.md',
      content: newContent,
      flat: false,
    };
  }
}
