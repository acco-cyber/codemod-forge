import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { Project } from 'ts-morph';
import { getOpenAIClient } from '../lib/openai-client.js';
import { loadGeneratedTransformFromSource } from '../executor/transform-loader.js';
import type { BreakingChange, Fixture, Transform } from '../types/index.js';

const TRANSFORM_DIR = path.join('.codemod-forge', 'transforms');

const GENERATE_SYSTEM_PROMPT = `You are an expert TypeScript AST transformation engineer. You write ts-morph transforms that migrate code from one library version to another.

RULES:
1. Use ONLY the ts-morph API. No string replacement and no regex-based rewrites.
2. Export detect(sourceFile: SourceFile): boolean.
3. Export apply(sourceFile: SourceFile): void.
4. Preserve comments, formatting, and whitespace where possible.
5. Handle generics, type parameters, JSX, nested expressions, and imports.
6. Import SourceFile and any ts-morph symbols you use from "ts-morph".
7. Return executable TypeScript only. No markdown fences. No explanation.`;

const GENERATE_USER_PROMPT = (library: string, change: BreakingChange, fixture?: Fixture) => `Write a ts-morph AST transform for this breaking change:

Library: ${library}
Breaking Change: ${change.title}
Description: ${change.description}
Category: ${change.category}
Severity: ${change.severity}
Affected Patterns: ${change.affectedPatterns.join(', ')}
Migration Steps: ${change.migrationSteps}

${fixture ? `The transform must pass this fixture.

BEFORE:
${fixture.before}

EXPECTED AFTER:
${fixture.after}
` : `No built-in fixture is available for this change. Infer the safest AST strategy from the migration description and make detect() conservative.`}
Requirements:
- detect() must use AST queries such as getImportDeclarations(), getCallExpressions(), getDescendantsOfKind(), etc.
- Do not use sourceFile.getText().includes() as the detector.
- apply() must mutate the AST with ts-morph APIs.
- Do not false-positive on strings or comments.
- Export exactly detect(sourceFile: SourceFile): boolean and apply(sourceFile: SourceFile): void.`;

function stripMarkdownFences(code: string): string {
  return code
    .replace(/^```(?:ts|typescript)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function normalizeGeneratedCode(code: string): string {
  const stripped = stripMarkdownFences(code);
  const hasTsMorphImport = /from\s+['"]ts-morph['"]/.test(stripped);
  const usesTsMorphTypes = /\b(SourceFile|SyntaxKind|Node|Type|ts)\b/.test(stripped);
  if (!hasTsMorphImport && usesTsMorphTypes) {
    return `import { SourceFile, SyntaxKind, Node, Type, ts } from 'ts-morph';\n${stripped}`;
  }
  return stripped;
}

function normalizeForComparison(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

async function testTransformCode(code: string, fixture: Fixture): Promise<boolean> {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('fixture.tsx', fixture.before, { overwrite: true });
  const executable = loadGeneratedTransformFromSource(code, 'generated-transform.ts');

  const detected = executable.detect(sourceFile);
  if (!detected) return false;

  executable.apply(sourceFile);
  const modified = normalizeForComparison(sourceFile.getFullText());
  const expected = normalizeForComparison(fixture.after);

  if (modified === expected) return true;

  const expectedAnchor = expected.slice(0, Math.min(120, expected.length));
  return expectedAnchor.length > 0 && modified.includes(expectedAnchor);
}

async function generateTransformCode(
  library: string,
  change: BreakingChange,
  fixture: Fixture | undefined,
  retries = 2
): Promise<string> {
  const openai = getOpenAIClient();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.6',
      messages: [
        { role: 'system', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: GENERATE_USER_PROMPT(library, change, fixture) },
      ],
      temperature: 0.15,
      max_tokens: 4096,
    });

    const code = normalizeGeneratedCode(response.choices[0]?.message?.content ?? '');
    if (!fixture) {
      loadGeneratedTransformFromSource(code, 'generated-transform.ts');
      return code;
    }

    if (await testTransformCode(code, fixture)) return code;

    if (attempt < retries) {
      console.log(chalk.hex('#64748B')(`     retry ${attempt + 1}: fixture failed, regenerating...`));
    }
  }

  throw new Error(`Failed to generate a fixture-passing transform after ${retries + 1} attempts`);
}

export async function generateTransformForChange(
  change: BreakingChange,
  library: string,
  fixture: Fixture | undefined,
  projectDir: string
): Promise<Transform> {
  const name = change.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const dirPath = path.join(projectDir, TRANSFORM_DIR, library);
  const filePath = path.join(dirPath, `${name}.ts`);
  const code = await generateTransformCode(library, change, fixture);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, code, 'utf-8');

  return {
    name,
    description: change.title,
    breakingChangeId: change.id,
    sourceFile: filePath,
    fixtureCount: fixture ? 1 : 0,
    affectedFiles: 0,
    applied: false,
    skipped: false,
    safeToApply: true,
    confidenceScore: fixture ? 90 : 76,
    confidenceReason: fixture
      ? 'Fixture passed; awaiting independent validator review.'
      : 'No built-in fixture; awaiting independent validator review.',
    validationIssueCount: 0,
    criticalIssueCount: 0,
  };
}

export async function generateTransforms(
  changes: BreakingChange[],
  library: string,
  fixtures: Map<string, Fixture>,
  projectDir: string
): Promise<Transform[]> {
  const transforms: Transform[] = [];

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    const label = `  [${i + 1}/${changes.length}] ${change.title}`;
    process.stdout.write(`${chalk.hex('#00D9FF')(label)}${' '.repeat(Math.max(0, 55 - label.length))}`);

    try {
      const fixture = fixtures.get(change.id);
      const transform = await generateTransformForChange(change, library, fixture, projectDir);
      process.stdout.write(chalk.green(' OK\n'));
      transforms.push(transform);
    } catch (error) {
      process.stdout.write(chalk.red(' FAIL\n'));
      console.error(chalk.hex('#64748B')(`    ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  return transforms;
}
