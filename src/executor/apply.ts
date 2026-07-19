import chalk from 'chalk';
import { glob } from 'glob';
import { Project } from 'ts-morph';
import type { Transform } from '../types/index.js';
import { createBackup } from './backup.js';
import { loadGeneratedTransform } from './transform-loader.js';

export async function applyTransforms(
  transforms: Transform[],
  projectDir: string
): Promise<void> {
  const activeTransforms = transforms.filter(transform => !transform.skipped);
  if (activeTransforms.length === 0) {
    console.log(chalk.hex('#64748B')('  No approved transforms to apply.'));
    return;
  }

  await createBackup(projectDir);

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectDir,
    ignore: ['node_modules/**', '.git/**', '.codemod-forge/**', 'dist/**', '.next/**'],
    absolute: true,
  });

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(files);

  for (const transform of activeTransforms) {
    try {
      const executable = await loadGeneratedTransform(transform.sourceFile);
      let changedFiles = 0;

      for (const sourceFile of project.getSourceFiles()) {
        if (executable.detect(sourceFile)) {
          executable.apply(sourceFile);
          await sourceFile.save();
          changedFiles++;
        }
      }

      transform.applied = changedFiles > 0;
      transform.affectedFiles = changedFiles;
      console.log(chalk.green(`  OK ${transform.description} (${changedFiles} files)`));
    } catch (error) {
      transform.applied = false;
      transform.skipped = true;
      console.log(chalk.red(`  FAIL ${transform.description}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}
