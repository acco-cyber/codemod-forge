import fs from 'fs';
import { glob } from 'glob';
import chalk from 'chalk';
import { Project } from 'ts-morph';
import type { DryRunResult, FileDiff, Transform } from '../types/index.js';
import { loadGeneratedTransform } from './transform-loader.js';

/** Run all transforms in-memory, collect diffs, and never write to disk. */
export async function dryRunTransforms(
  transforms: Transform[],
  projectDir: string
): Promise<DryRunResult[]> {
  console.log(chalk.hex('#B4A0FF')('\nDry run: executing generated transforms in memory...'));
  const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectDir,
    ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', '.codemod-forge/**'],
    absolute: true,
  });
  console.log(chalk.hex('#64748B')(`  ${allFiles.length} source files found`));

  const existingFiles = allFiles.filter(filePath => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  });

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(existingFiles);

  const results: DryRunResult[] = [];

  for (const transform of transforms) {
    const fileDiffs: FileDiff[] = [];
    const errors: DryRunResult['errors'] = [];

    if (transform.skipped) {
      console.log(
        `  ${chalk.hex('#00D9FF')(transform.name.padEnd(35))}${chalk.hex('#64748B')('skipped by validator')}`
      );
      results.push({ transform, fileDiffs, totalChanges: 0, errors });
      continue;
    }

    try {
      const executable = await loadGeneratedTransform(transform.sourceFile);

      for (const sourceFile of project.getSourceFiles()) {
        try {
          if (executable.detect(sourceFile)) {
            const original = sourceFile.getFullText();
            executable.apply(sourceFile);
            const modified = sourceFile.getFullText();
            sourceFile.replaceWithText(original);

            if (original !== modified) {
              const originalLines = original.split('\n').length;
              const modifiedLines = modified.split('\n').length;
              fileDiffs.push({
                filePath: sourceFile.getFilePath(),
                original,
                modified,
                lineCount: {
                  added: Math.max(0, modifiedLines - originalLines),
                  removed: Math.max(0, originalLines - modifiedLines),
                },
              });
            }
          }
        } catch (error) {
          errors.push({
            transformName: transform.name,
            message: error instanceof Error ? error.message : String(error),
            filePath: sourceFile.getFilePath(),
          });
        }
      }
    } catch (error) {
      errors.push({
        transformName: transform.name,
        message: `Failed to load transform: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    transform.affectedFiles = fileDiffs.length;
    const totalChanges = fileDiffs.reduce(
      (sum, diff) => sum + diff.lineCount.added + diff.lineCount.removed,
      0
    );
    const status = errors.length > 0 ? chalk.red('errors') : chalk.green(`${fileDiffs.length} files`);
    console.log(
      `  ${chalk.hex('#00D9FF')(transform.name.padEnd(35))}${status}  ${chalk.hex('#64748B')(`${totalChanges} changes`)}`
    );

    results.push({ transform, fileDiffs, totalChanges, errors });
  }

  return results;
}
