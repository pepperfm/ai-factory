import path from 'path';
import { existsSync, lstatSync } from 'fs';
import { createHash } from 'crypto';
import {
  copyDirectory,
  copyFile,
  getPackagePath,
  getSkillsDir,
  getSubagentsDir,
  ensureDir,
  listDirectories,
  listFilesRecursive,
  readTextFile,
  readFileBuffer,
  writeTextFile,
  removeDirectory,
  removeFile,
  fileExists,
  hashDirectory,
} from '../utils/fs.js';
import type { AgentInstallation, ManagedArtifactState } from './config.js';
import { AGENT_IDS, getAgentConfig } from './agents.js';
import type { ExtensionAgentFile } from './extensions.js';
import { AGENT_IDS, getAgentConfig } from './agents.js';
import { processSkillTemplates, buildTemplateVars, processTemplate } from './template.js';
import { getTransformer, extractFrontmatterName, replaceFrontmatterName } from './transformer.js';

const EXTENSION_INJECTION_BLOCK_PATTERN = /\n?<!-- aif-ext:[^:]+:[^:]+:[^:]+:start -->\n[\s\S]*?\n<!-- aif-ext:[^:]+:[^:]+:[^:]+:end -->\n?/g;

export type SkillUpdateStatus = 'changed' | 'unchanged' | 'skipped' | 'removed';

export interface SkillUpdateEntry {
  skill: string;
  status: SkillUpdateStatus;
  reason: string;
}

export interface UpdateSkillsResult {
  installedSkills: string[];
  entries: SkillUpdateEntry[];
}

export interface SubagentUpdateEntry {
  subagent: string;
  status: SkillUpdateStatus;
  reason: string;
}

export interface UpdateSubagentsResult {
  installedAgentFiles: string[];
  entries: SubagentUpdateEntry[];
}

export interface ConfigFileUpdateEntry {
  configFile: string;
  status: SkillUpdateStatus;
  reason: string;
}

export interface UpdateConfigFilesResult {
  installedConfigFiles: string[];
  entries: ConfigFileUpdateEntry[];
}

export interface UpdateSkillsOptions {
  excludeSkills?: string[];
  force?: boolean;
}

export interface InstallOptions {
  projectDir: string;
  skillsDir: string;
  skills: string[];
  agentId: string;
}

export interface InstallSubagentsOptions {
  projectDir: string;
  agentId?: string;
  agentsDir?: string;
  subagentsDir?: string;
}

export interface InstallConfigFilesOptions {
  projectDir: string;
  agentId: string;
  configFiles: string[];
}

interface ResolvedSkillPaths {
  sourceSkillDir: string;
  targetSkillDir: string;
  targetSkillFile: string;
  targetRefsDir: string;
  sourceRefsDir: string;
  flat: boolean;
}

interface ResolvedAgentFilePaths {
  sourceFile: string;
  targetFile: string;
  sourceRelPath: string;
  targetRelPath: string;
}

interface ResolvedConfigFilePaths {
  sourceFile: string;
  targetFile: string;
  relPath: string;
}

function assertSafeManagedRelativePath(relPath: string): void {
  const normalized = path.posix.normalize(relPath.replaceAll('\\', '/'));
  if (normalized.startsWith('/')) {
    throw new Error(`Managed artifact path must be relative: ${relPath}`);
  }
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Managed artifact path must not escape its base directory: ${relPath}`);
  }
}

function normalizeMarkdownForManagedHash(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(EXTENSION_INJECTION_BLOCK_PATTERN, '')
    .trimEnd();
}

async function readManagedFileForHash(filePath: string): Promise<Buffer | null> {
  if (path.extname(filePath).toLowerCase() === '.md') {
    const content = await readTextFile(filePath);
    if (!content) {
      return null;
    }
    return Buffer.from(normalizeMarkdownForManagedHash(content), 'utf-8');
  }

  return readFileBuffer(filePath);
}

async function hashManagedFiles(files: Array<{ absPath: string; relPath: string }>): Promise<string | null> {
  if (files.length === 0) {
    return null;
  }

  const sortedFiles = [...files].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const hasher = createHash('sha256');

  for (const file of sortedFiles) {
    const content = await readManagedFileForHash(file.absPath);
    if (!content) {
      return null;
    }
    hasher.update(`path:${file.relPath}\n`);
    hasher.update(content);
    hasher.update('\n');
  }

  return hasher.digest('hex');
}

async function hashManagedDirectory(dirPath: string): Promise<string | null> {
  const files = await listFilesRecursive(dirPath);
  if (files.length === 0) {
    return null;
  }

  const mapped = files.map(absPath => ({
    absPath,
    relPath: path.relative(dirPath, absPath).replaceAll('\\', '/'),
  }));

  return hashManagedFiles(mapped);
}

async function hashManagedFile(filePath: string, relPath: string): Promise<string | null> {
  return hashManagedFiles([{ absPath: filePath, relPath }]);
}

function resolveSkillPaths(
  projectDir: string,
  skillsDir: string,
  agentId: string,
  skillName: string,
  sourceSkillDir: string,
): ResolvedSkillPaths {
  const transformer = getTransformer(agentId);
  const agentConfig = getAgentConfig(agentId);
  const transformed = transformer.transform(skillName, '');

  const sourceRefsDir = path.join(sourceSkillDir, 'references');
  if (transformed.flat) {
    const targetSkillDir = path.join(projectDir, agentConfig.configDir, transformed.targetDir);
    return {
      sourceSkillDir,
      targetSkillDir,
      targetSkillFile: path.join(targetSkillDir, transformed.targetName),
      targetRefsDir: path.join(targetSkillDir, 'references'),
      sourceRefsDir,
      flat: true,
    };
  }

  const targetSkillDir = path.join(projectDir, skillsDir, transformed.targetDir);
  return {
    sourceSkillDir,
    targetSkillDir,
    targetSkillFile: path.join(targetSkillDir, 'SKILL.md'),
    targetRefsDir: path.join(targetSkillDir, 'references'),
    sourceRefsDir,
    flat: false,
  };
}

function ensureTargetWithinRoot(targetRoot: string, targetFile: string): void {
  const resolvedRoot = path.resolve(targetRoot);

  // Reject a symlinked root when it already exists so managed agent files
  // cannot be redirected outside the project by replacing `.claude/agents`
  // or another runtime-local agents directory with a symlink.
  if (existsSync(resolvedRoot) && lstatSync(resolvedRoot).isSymbolicLink()) {
    throw new Error(`Agent files directory must not be a symbolic link: ${targetRoot}`);
  }

  const resolvedTarget = path.resolve(targetFile);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Agent file target escapes agents directory: ${targetFile}`);
  }
}

function resolveAgentFilePaths(
  projectDir: string,
  agentsDir: string,
  sourceRoot: string,
  sourceRelPath: string,
  targetRelPath: string = sourceRelPath,
): ResolvedAgentFilePaths {
  const targetRoot = path.join(projectDir, agentsDir);
  const sourceFile = path.join(sourceRoot, sourceRelPath);
  const targetFile = path.join(targetRoot, targetRelPath);
  ensureTargetWithinRoot(targetRoot, targetFile);
  return {
    sourceFile,
    targetFile,
    sourceRelPath,
    targetRelPath,
  };
}

export function resolveManagedConfigFilePaths(projectDir: string, agentId: string, relPath: string): ResolvedConfigFilePaths {
  assertSafeManagedRelativePath(relPath);
  const agentConfig = getAgentConfig(agentId);
  const sourceRoot = agentConfig.configFilesSourceDir
    ? getPackagePath(agentConfig.configFilesSourceDir)
    : null;

  if (!sourceRoot) {
    throw new Error(`Agent "${agentId}" does not define managed config files.`);
  }

  return {
    sourceFile: path.join(sourceRoot, relPath),
    targetFile: path.join(projectDir, agentConfig.configDir, relPath),
    relPath,
  };
}

function getBundledAgentFilesSourceDir(agentId: string): string | null {
  const agentConfig = getAgentConfig(agentId);
  if (agentConfig.source !== 'builtin') {
    return null;
  }

  if (agentConfig.agentsSourceDir) {
    return getPackagePath(agentConfig.agentsSourceDir);
  }

  return agentId === AGENT_IDS.claude ? getSubagentsDir() : null;
}

export function resolveManagedSubagentPaths(
  projectDir: string,
  agentId: string,
  agentsDir: string,
  relPath: string,
): ResolvedAgentFilePaths {
  assertSafeManagedRelativePath(relPath);
  const sourceRoot = getBundledAgentFilesSourceDir(agentId);

  if (!sourceRoot) {
    throw new Error(`Agent "${agentId}" does not define bundled agent files.`);
  }

  return resolveAgentFilePaths(projectDir, agentsDir, sourceRoot, relPath);
}

async function hashInstalledSkill(paths: ResolvedSkillPaths): Promise<string | null> {
  if (!paths.flat) {
    return hashManagedDirectory(paths.targetSkillDir);
  }

  const mainFileExists = await fileExists(paths.targetSkillFile);
  if (!mainFileExists) {
    return null;
  }

  const filesToHash: Array<{ absPath: string; relPath: string }> = [
    {
      absPath: paths.targetSkillFile,
      relPath: path.basename(paths.targetSkillFile),
    },
  ];

  const sourceRefs = await listFilesRecursive(paths.sourceRefsDir);
  for (const sourceRef of sourceRefs) {
    const relPath = path.relative(paths.sourceRefsDir, sourceRef).replaceAll('\\', '/');
    const targetRef = path.join(paths.targetRefsDir, relPath);
    filesToHash.push({
      absPath: targetRef,
      relPath: `references/${relPath}`,
    });
  }

  return hashManagedFiles(filesToHash);
}

async function getManagedSkillState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillName: string,
): Promise<ManagedArtifactState | null> {
  const sourceSkillDir = path.join(getSkillsDir(), skillName);
  const sourceHash = await hashDirectory(sourceSkillDir);
  if (!sourceHash) {
    return null;
  }

  const paths = resolveSkillPaths(projectDir, agentInstallation.skillsDir, agentInstallation.id, skillName, sourceSkillDir);
  const installedHash = await hashInstalledSkill(paths);
  if (!installedHash) {
    return null;
  }

  return {
    sourceHash,
    installedHash,
  };
}

export async function buildManagedSkillsState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  baseSkills: string[],
): Promise<Record<string, ManagedArtifactState>> {
  const state: Record<string, ManagedArtifactState> = {};

  for (const skillName of baseSkills) {
    const managed = await getManagedSkillState(projectDir, agentInstallation, skillName);
    if (managed) {
      state[skillName] = managed;
    }
  }

  return state;
}

export async function getAvailableSubagents(agentId: string = 'claude'): Promise<string[]> {
  const packageSubagentsDir = getBundledAgentFilesSourceDir(agentId);
  if (!packageSubagentsDir) {
    return [];
  }
  const files = await listFilesRecursive(packageSubagentsDir);
  const relPaths = files.map(filePath => path.relative(packageSubagentsDir, filePath).replaceAll('\\', '/'));

  if (agentId === AGENT_IDS.claude) {
    // Claude bundle lives in the top-level package subagents directory. Nested
    // paths belong to runtime-specific bundles such as Codex and must never be
    // materialized into `.claude/agents/`.
    return relPaths.filter(relPath => !relPath.includes('/'));
  }

  // Runtime-specific bundles like Codex intentionally preserve nested paths so
  // future agent groups can live under a dedicated package subdirectory.
  return relPaths;
}

async function getManagedSubagentState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  relPath: string,
): Promise<ManagedArtifactState | null> {
  if (!agentInstallation.agentsDir) {
    return null;
  }
  const paths = resolveManagedSubagentPaths(projectDir, agentInstallation.id, agentInstallation.agentsDir, relPath);
  const sourceHash = await hashManagedFile(paths.sourceFile, relPath);
  if (!sourceHash) {
    return null;
  }

  const installedHash = await hashManagedFile(paths.targetFile, relPath);
  if (!installedHash) {
    return null;
  }

  return {
    sourceHash,
    installedHash,
  };
}

export async function buildManagedSubagentsState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  installedSubagents: string[],
): Promise<Record<string, ManagedArtifactState>> {
  const state: Record<string, ManagedArtifactState> = {};

  if (!agentInstallation.agentsDir) {
    return state;
  }

  for (const relPath of installedSubagents) {
    const managed = await getManagedSubagentState(projectDir, agentInstallation, relPath);
    if (managed) {
      state[relPath] = managed;
    }
  }

  return state;
}

async function getManagedConfigFileState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  relPath: string,
): Promise<ManagedArtifactState | null> {
  const configuredFiles = agentInstallation.configFiles ?? getAgentConfig(agentInstallation.id).configFiles ?? [];
  if (!configuredFiles.includes(relPath)) {
    return null;
  }

  const paths = resolveManagedConfigFilePaths(projectDir, agentInstallation.id, relPath);
  const sourceHash = await hashManagedFile(paths.sourceFile, relPath);
  if (!sourceHash) {
    return null;
  }

  const installedHash = await hashManagedFile(paths.targetFile, relPath);
  if (!installedHash) {
    return null;
  }

  return {
    sourceHash,
    installedHash,
  };
}

export async function buildManagedConfigFilesState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  installedConfigFiles: string[],
): Promise<Record<string, ManagedArtifactState>> {
  const state: Record<string, ManagedArtifactState> = {};
  const configuredFiles = agentInstallation.configFiles ?? getAgentConfig(agentInstallation.id).configFiles ?? [];

  if (configuredFiles.length === 0) {
    return state;
  }

  for (const relPath of installedConfigFiles) {
    const managed = await getManagedConfigFileState(projectDir, agentInstallation, relPath);
    if (managed) {
      state[relPath] = managed;
    }
  }

  return state;
}

async function installSkillWithTransformer(
  sourceSkillDir: string,
  skillName: string,
  projectDir: string,
  skillsDir: string,
  agentId: string,
  agentConfig: ReturnType<typeof getAgentConfig>,
): Promise<void> {
  const transformer = getTransformer(agentId);
  const skillMdPath = path.join(sourceSkillDir, 'SKILL.md');
  const content = await readTextFile(skillMdPath);
  if (!content) {
    throw new Error(`SKILL.md not found in ${sourceSkillDir}`);
  }

  // If skill is installed under a different name (e.g. replacement), rewrite frontmatter name
  const fmName = extractFrontmatterName(content);
  const adjustedContent = (fmName && fmName !== skillName) ? replaceFrontmatterName(content, skillName) : content;

  const result = transformer.transform(skillName, adjustedContent);
  const vars = buildTemplateVars(agentConfig);

  if (result.flat) {
    const targetPath = path.join(projectDir, agentConfig.configDir, result.targetDir, result.targetName);
    await writeTextFile(targetPath, processTemplate(result.content, vars));

    // Copy references directory if it exists in the source skill
    const sourceRefsDir = path.join(sourceSkillDir, 'references');
    if (await fileExists(sourceRefsDir)) {
      const targetRefsDir = path.join(projectDir, agentConfig.configDir, result.targetDir, 'references');
      await copyDirectory(sourceRefsDir, targetRefsDir);
    }
  } else {
    const targetSkillDir = path.join(projectDir, skillsDir, result.targetDir);
    await copyDirectory(sourceSkillDir, targetSkillDir);
    if (result.content !== content) {
      await writeTextFile(path.join(targetSkillDir, 'SKILL.md'), result.content);
    } else if (adjustedContent !== content) {
      await writeTextFile(path.join(targetSkillDir, 'SKILL.md'), adjustedContent);
    }
    await processSkillTemplates(targetSkillDir, agentConfig);
  }
}

export async function installSkills(options: InstallOptions): Promise<string[]> {
  const { projectDir, skillsDir, skills, agentId } = options;
  const installedSkills: string[] = [];
  const agentConfig = getAgentConfig(agentId);

  const targetDir = path.join(projectDir, skillsDir);
  await ensureDir(targetDir);

  const packageSkillsDir = getSkillsDir();

  for (const skill of skills) {
    const sourceSkillDir = path.join(packageSkillsDir, skill);

    try {
      await installSkillWithTransformer(sourceSkillDir, skill, projectDir, skillsDir, agentId, agentConfig);
      installedSkills.push(skill);
    } catch (error) {
      console.warn(`Warning: Could not install skill "${skill}": ${error}`);
    }
  }

  const transformer = getTransformer(agentId);
  if (transformer.postInstall) {
    await transformer.postInstall(projectDir);
  }

  return installedSkills;
}

export async function installSubagents(options: InstallSubagentsOptions): Promise<string[]> {
  const { projectDir } = options;
  const agentId = options.agentId ?? 'claude';
  const agentsDir = options.agentsDir ?? options.subagentsDir;
  if (!agentsDir) {
    return [];
  }
  const availableSubagents = await getAvailableSubagents(agentId);

  if (availableSubagents.length === 0) {
    return [];
  }

  const targetRoot = path.join(projectDir, agentsDir);
  await ensureDir(targetRoot);

  for (const relPath of availableSubagents) {
    const paths = resolveManagedSubagentPaths(projectDir, agentId, agentsDir, relPath);
    await copyFile(paths.sourceFile, paths.targetFile);
  }

  return availableSubagents;
}

export async function installConfigFiles(options: InstallConfigFilesOptions): Promise<string[]> {
  const { projectDir, agentId, configFiles } = options;

  if (configFiles.length === 0) {
    return [];
  }

  for (const relPath of configFiles) {
    const paths = resolveManagedConfigFilePaths(projectDir, agentId, relPath);
    await copyFile(paths.sourceFile, paths.targetFile);
  }

  return configFiles;
}

export function partitionSkills(skills: string[]): { base: string[], custom: string[] } {
  return {
    base: skills.filter(s => !s.includes('/')),
    custom: skills.filter(s => s.includes('/')),
  };
}

export async function getAvailableSkills(): Promise<string[]> {
  const packageSkillsDir = getSkillsDir();
  const dirs = await listDirectories(packageSkillsDir);
  return dirs.filter(dir => !dir.startsWith('_'));
}

export async function installExtensionSkills(
  projectDir: string,
  agentInstallation: AgentInstallation,
  extensionDir: string,
  skillPaths: string[],
  nameOverrides?: Record<string, string>,
): Promise<string[]> {
  const agentConfig = getAgentConfig(agentInstallation.id);
  const installed: string[] = [];

  for (const skillPath of skillPaths) {
    const sourceDir = path.join(extensionDir, skillPath);
    const skillName = nameOverrides?.[skillPath] ?? path.basename(skillPath);
    try {
      await installSkillWithTransformer(sourceDir, skillName, projectDir, agentInstallation.skillsDir, agentInstallation.id, agentConfig);
      installed.push(skillName);
    } catch (error) {
      console.warn(`Warning: Could not install extension skill "${skillName}": ${error}`);
    }
  }

  return installed;
}

async function removeSkillsByName(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillNames: string[],
): Promise<string[]> {
  const agentConfig = getAgentConfig(agentInstallation.id);
  const transformer = getTransformer(agentInstallation.id);
  const removed: string[] = [];

  for (const skillName of skillNames) {
    try {
      const result = transformer.transform(skillName, '');
      if (result.flat) {
        const targetPath = path.join(projectDir, agentConfig.configDir, result.targetDir, result.targetName);
        await removeDirectory(targetPath);
      } else {
        const targetSkillDir = path.join(projectDir, agentInstallation.skillsDir, result.targetDir);
        await removeDirectory(targetSkillDir);
      }
      removed.push(skillName);
    } catch {
      // Skill may not exist, ignore
    }
  }

  return removed;
}

async function removeSubagentsByName(
  projectDir: string,
  agentInstallation: AgentInstallation,
  subagentNames: string[],
): Promise<string[]> {
  if (!agentInstallation.agentsDir) {
    return [];
  }

  const removed: string[] = [];

  for (const relPath of subagentNames) {
    try {
      const targetRoot = path.join(projectDir, agentInstallation.agentsDir);
      const targetFile = path.join(targetRoot, relPath);
      ensureTargetWithinRoot(targetRoot, targetFile);
      await removeFile(targetFile);
      removed.push(relPath);
    } catch {
      // Subagent file may not exist, ignore
    }
  }

  return removed;
}

async function removeConfigFilesByName(
  projectDir: string,
  agentInstallation: AgentInstallation,
  configFiles: string[],
): Promise<string[]> {
  const removed: string[] = [];

  for (const relPath of configFiles) {
    try {
      const { targetFile } = resolveManagedConfigFilePaths(projectDir, agentInstallation.id, relPath);
      await removeFile(targetFile);
      removed.push(relPath);
    } catch {
      // Config file may not exist, ignore.
    }
  }

  return removed;
}

export async function removeExtensionSkills(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillPaths: string[],
): Promise<string[]> {
  return removeSkillsByName(projectDir, agentInstallation, skillPaths.map(p => path.basename(p)));
}

export async function updateSkills(
  agentInstallation: AgentInstallation,
  projectDir: string,
  options: UpdateSkillsOptions = {},
): Promise<UpdateSkillsResult> {
  const { excludeSkills = [], force = false } = options;
  const availableSkills = await getAvailableSkills();
  const availableSet = new Set(availableSkills);
  const excludeSet = new Set(excludeSkills);

  const entries: SkillUpdateEntry[] = [];

  const { base: previousBaseSkills, custom } = partitionSkills(agentInstallation.installedSkills);
  const previousBaseSet = new Set(previousBaseSkills);
  const previousManaged = agentInstallation.managedSkills ?? {};

  const removedSkills = previousBaseSkills.filter(s => !availableSet.has(s) && !excludeSet.has(s));
  if (removedSkills.length > 0) {
    await removeSkillsByName(projectDir, agentInstallation, removedSkills);
    for (const skill of removedSkills) {
      entries.push({
        skill,
        status: 'removed',
        reason: 'package-removed',
      });
    }
  }

  const replacedSkills = previousBaseSkills.filter(s => excludeSet.has(s));
  for (const skill of replacedSkills) {
    entries.push({
      skill,
      status: 'skipped',
      reason: 'replaced-by-extension',
    });
  }

  const newlyAvailable = availableSkills.filter(s => !previousBaseSet.has(s) && !excludeSet.has(s));
  for (const skill of newlyAvailable) {
    entries.push({
      skill,
      status: 'skipped',
      reason: 'new-skill-not-installed',
    });
  }

  const updatableBaseSkills = previousBaseSkills.filter(s => availableSet.has(s) && !excludeSet.has(s));
  const shouldInstall = new Map<string, { install: boolean; reason: string }>();

  for (const skillName of updatableBaseSkills) {
    const sourceSkillDir = path.join(getSkillsDir(), skillName);
    const sourceHash = await hashDirectory(sourceSkillDir);
    const paths = resolveSkillPaths(projectDir, agentInstallation.skillsDir, agentInstallation.id, skillName, sourceSkillDir);
    const installedHash = await hashInstalledSkill(paths);
    const previousState = previousManaged[skillName];

    if (force) {
      shouldInstall.set(skillName, { install: true, reason: 'force-clean-reinstall' });
      continue;
    }

    if (!sourceHash) {
      shouldInstall.set(skillName, { install: true, reason: 'source-missing' });
      continue;
    }

    if (!previousState) {
      shouldInstall.set(skillName, { install: true, reason: 'missing-managed-state' });
      continue;
    }

    if (!installedHash) {
      shouldInstall.set(skillName, { install: true, reason: 'missing-installed-artifact' });
      continue;
    }

    if (previousState.sourceHash !== sourceHash) {
      shouldInstall.set(skillName, { install: true, reason: 'source-hash-changed' });
      continue;
    }

    if (previousState.installedHash !== installedHash) {
      console.warn(`Warning: Local modifications detected in skill "${skillName}" — will be overwritten by update.`);
      shouldInstall.set(skillName, { install: true, reason: 'installed-hash-drift' });
      continue;
    }

    shouldInstall.set(skillName, { install: false, reason: 'up-to-date' });
  }

  const skillsToInstall = updatableBaseSkills.filter(skillName => shouldInstall.get(skillName)?.install === true);

  if (force && skillsToInstall.length > 0) {
    await removeSkillsByName(projectDir, agentInstallation, skillsToInstall);
  }

  const installedBaseSkills = skillsToInstall.length > 0
    ? await installSkills({
      projectDir,
      skillsDir: agentInstallation.skillsDir,
      skills: skillsToInstall,
      agentId: agentInstallation.id,
    })
    : [];

  const installedSet = new Set(installedBaseSkills);

  for (const skillName of updatableBaseSkills) {
    const decision = shouldInstall.get(skillName);
    if (!decision) {
      continue;
    }

    if (decision.install) {
      entries.push({
        skill: skillName,
        status: installedSet.has(skillName) ? 'changed' : 'skipped',
        reason: installedSet.has(skillName) ? decision.reason : 'install-failed',
      });
      continue;
    }

    entries.push({
      skill: skillName,
      status: 'unchanged',
      reason: decision.reason,
    });
  }

  const retainedBaseSkills = previousBaseSkills.filter(s => (availableSet.has(s) || excludeSet.has(s)) && !removedSkills.includes(s));

  return {
    installedSkills: [...retainedBaseSkills, ...custom],
    entries,
  };
}

export async function updateSubagents(
  agentInstallation: AgentInstallation,
  projectDir: string,
  options: UpdateSkillsOptions = {},
): Promise<UpdateSubagentsResult> {
  if (!agentInstallation.agentsDir) {
    return {
      installedAgentFiles: [],
      entries: [],
    };
  }

  const { force = false } = options;
  const availableSubagents = await getAvailableSubagents(agentInstallation.id);
  const availableSet = new Set(availableSubagents);
  const previousInstalled = agentInstallation.installedAgentFiles ?? [];
  const previousInstalledSet = new Set(previousInstalled);
  const previousManaged = agentInstallation.managedAgentFiles ?? {};
  const entries: SubagentUpdateEntry[] = [];

  const removedSubagents = previousInstalled.filter((subagent: string) => !availableSet.has(subagent));
  if (removedSubagents.length > 0) {
    await removeSubagentsByName(projectDir, agentInstallation, removedSubagents);
    for (const subagent of removedSubagents) {
      entries.push({
        subagent,
        status: 'removed',
        reason: 'package-removed',
      });
    }
  }

  const shouldInstall = new Map<string, { install: boolean; reason: string }>();

  for (const relPath of availableSubagents) {
    const paths = resolveManagedSubagentPaths(projectDir, agentInstallation.id, agentInstallation.agentsDir, relPath);
    const sourceHash = await hashManagedFile(paths.sourceFile, relPath);
    const installedHash = await hashManagedFile(paths.targetFile, relPath);
    const previousState = previousManaged[relPath];

    if (force) {
      shouldInstall.set(relPath, { install: true, reason: 'force-clean-reinstall' });
      continue;
    }

    if (!previousInstalledSet.has(relPath)) {
      shouldInstall.set(relPath, { install: true, reason: 'new-in-package' });
      continue;
    }

    if (!sourceHash) {
      shouldInstall.set(relPath, { install: false, reason: 'source-missing' });
      continue;
    }

    if (!previousState) {
      shouldInstall.set(relPath, { install: true, reason: 'missing-managed-state' });
      continue;
    }

    if (!installedHash) {
      shouldInstall.set(relPath, { install: true, reason: 'missing-installed-artifact' });
      continue;
    }

    if (previousState.sourceHash !== sourceHash) {
      shouldInstall.set(relPath, { install: true, reason: 'source-hash-changed' });
      continue;
    }

    if (previousState.installedHash !== installedHash) {
      console.warn(`Warning: Local modifications detected in agent file "${relPath}" — will be overwritten by update.`);
      shouldInstall.set(relPath, { install: true, reason: 'installed-hash-drift' });
      continue;
    }

    shouldInstall.set(relPath, { install: false, reason: 'up-to-date' });
  }

  const subagentsToInstall = availableSubagents.filter(relPath => shouldInstall.get(relPath)?.install === true);
  const installedSubagents: string[] = [];

  for (const relPath of subagentsToInstall) {
    try {
      const paths = resolveManagedSubagentPaths(projectDir, agentInstallation.id, agentInstallation.agentsDir, relPath);
      await copyFile(paths.sourceFile, paths.targetFile);
      installedSubagents.push(relPath);
    } catch {
      // Install failure is reported through entries below.
    }
  }

  const installedSet = new Set(installedSubagents);

  for (const relPath of availableSubagents) {
    const decision = shouldInstall.get(relPath);
    if (!decision) {
      continue;
    }

    if (decision.install) {
      entries.push({
        subagent: relPath,
        status: installedSet.has(relPath) ? 'changed' : 'skipped',
        reason: installedSet.has(relPath) ? decision.reason : 'install-failed',
      });
      continue;
    }

    entries.push({
      subagent: relPath,
      status: decision.reason === 'up-to-date' ? 'unchanged' : 'skipped',
      reason: decision.reason,
    });
  }

  const syncedSubagents = availableSubagents.filter(relPath => installedSet.has(relPath) || previousInstalledSet.has(relPath));

  return {
    installedAgentFiles: syncedSubagents,
    entries,
  };
}

export async function updateConfigFiles(
  agentInstallation: AgentInstallation,
  projectDir: string,
  options: UpdateSkillsOptions = {},
): Promise<UpdateConfigFilesResult> {
  const configuredFiles = agentInstallation.configFiles ?? getAgentConfig(agentInstallation.id).configFiles ?? [];
  if (configuredFiles.length === 0) {
    return {
      installedConfigFiles: [],
      entries: [],
    };
  }

  const { force = false } = options;
  const availableSet = new Set(configuredFiles);
  const previousInstalled = agentInstallation.installedConfigFiles ?? [];
  const previousInstalledSet = new Set(previousInstalled);
  const previousManaged = agentInstallation.managedConfigFiles ?? {};
  const entries: ConfigFileUpdateEntry[] = [];

  const removedFiles = previousInstalled.filter(file => !availableSet.has(file));
  if (removedFiles.length > 0) {
    await removeConfigFilesByName(projectDir, agentInstallation, removedFiles);
    for (const file of removedFiles) {
      entries.push({
        configFile: file,
        status: 'removed',
        reason: 'package-removed',
      });
    }
  }

  const shouldInstall = new Map<string, { install: boolean; reason: string }>();

  for (const relPath of configuredFiles) {
    const paths = resolveManagedConfigFilePaths(projectDir, agentInstallation.id, relPath);
    const sourceHash = await hashManagedFile(paths.sourceFile, relPath);
    const installedHash = await hashManagedFile(paths.targetFile, relPath);
    const previousState = previousManaged[relPath];

    if (force) {
      shouldInstall.set(relPath, { install: true, reason: 'force-clean-reinstall' });
      continue;
    }

    if (!previousInstalledSet.has(relPath)) {
      shouldInstall.set(relPath, { install: true, reason: 'new-in-package' });
      continue;
    }

    if (!sourceHash) {
      shouldInstall.set(relPath, { install: false, reason: 'source-missing' });
      continue;
    }

    if (!previousState) {
      shouldInstall.set(relPath, { install: true, reason: 'missing-managed-state' });
      continue;
    }

    if (!installedHash) {
      shouldInstall.set(relPath, { install: true, reason: 'missing-installed-artifact' });
      continue;
    }

    if (previousState.sourceHash !== sourceHash) {
      shouldInstall.set(relPath, { install: true, reason: 'source-hash-changed' });
      continue;
    }

    if (previousState.installedHash !== installedHash) {
      console.warn(`Warning: Local modifications detected in config file "${relPath}" — will be overwritten by update.`);
      shouldInstall.set(relPath, { install: true, reason: 'installed-hash-drift' });
      continue;
    }

    shouldInstall.set(relPath, { install: false, reason: 'up-to-date' });
  }

  const filesToInstall = configuredFiles.filter(relPath => shouldInstall.get(relPath)?.install === true);
  const installedFiles: string[] = [];

  for (const relPath of filesToInstall) {
    try {
      const paths = resolveManagedConfigFilePaths(projectDir, agentInstallation.id, relPath);
      await copyFile(paths.sourceFile, paths.targetFile);
      installedFiles.push(relPath);
    } catch {
      // Install failure is reported through entries below.
    }
  }

  const installedSet = new Set(installedFiles);

  for (const relPath of configuredFiles) {
    const decision = shouldInstall.get(relPath);
    if (!decision) {
      continue;
    }

    if (decision.install) {
      entries.push({
        configFile: relPath,
        status: installedSet.has(relPath) ? 'changed' : 'skipped',
        reason: installedSet.has(relPath) ? decision.reason : 'install-failed',
      });
      continue;
    }

    entries.push({
      configFile: relPath,
      status: decision.reason === 'up-to-date' ? 'unchanged' : 'skipped',
      reason: decision.reason,
    });
  }

  const syncedFiles = configuredFiles.filter(relPath => {
    if (installedSet.has(relPath)) {
      return true;
    }

    const decision = shouldInstall.get(relPath);
    if (!decision || decision.install) {
      return false;
    }

    return previousInstalledSet.has(relPath);
  });

  return {
    installedConfigFiles: syncedFiles,
    entries,
  };
export class AgentFileInstallError extends Error {
  installedTargets: string[];

  constructor(message: string, installedTargets: string[]) {
    super(message);
    this.name = 'AgentFileInstallError';
    this.installedTargets = installedTargets;
  }
}

export async function installExtensionAgentFiles(
  projectDir: string,
  agentInstallation: AgentInstallation,
  extensionDir: string,
  agentFiles: ExtensionAgentFile[],
): Promise<string[]> {
  const agentsDir = agentInstallation.agentsDir;
  if (!agentsDir || agentFiles.length === 0) {
    return [];
  }

  const installed: string[] = [];

  for (const agentFile of agentFiles) {
    if (agentFile.runtime !== agentInstallation.id) {
      continue;
    }

    try {
      const paths = resolveAgentFilePaths(
        projectDir,
        agentsDir,
        extensionDir,
        agentFile.source,
        agentFile.target,
      );
      await copyFile(paths.sourceFile, paths.targetFile);
      installed.push(agentFile.target);
    } catch (error) {
      throw new AgentFileInstallError(
        `Could not install extension agent file "${agentFile.target}" for runtime "${agentInstallation.id}": ${(error as Error).message}`,
        installed,
      );
    }
  }

  return installed;
}

export async function removeExtensionAgentFiles(
  projectDir: string,
  agentInstallation: AgentInstallation,
  targets: string[],
): Promise<string[]> {
  const agentsDir = agentInstallation.agentsDir;
  if (!agentsDir || targets.length === 0) {
    return [];
  }

  const removed: string[] = [];
  const targetRoot = path.join(projectDir, agentsDir);

  for (const relPath of targets) {
    try {
      const targetFile = path.join(targetRoot, relPath);
      ensureTargetWithinRoot(targetRoot, targetFile);
      await removeFile(targetFile);
      removed.push(relPath);
    } catch {
      // File may already be absent.
    }
  }

  return removed;
}
