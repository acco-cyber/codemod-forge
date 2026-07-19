import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

/** Create a timestamped backup of all source files before applying transforms. */
export async function createBackup(projectDir: string): Promise<string> {
  const date = new Date().toISOString().split('T')[0];
  const backupDir = path.join(projectDir, '.codemod-forge', `backup-${date}`);
  await fs.mkdir(backupDir, { recursive: true });

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectDir,
    ignore: ['node_modules/**', '.git/**', '.codemod-forge/**', 'dist/**', '.next/**'],
  });

  for (const file of files) {
    const dest = path.join(backupDir, file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(projectDir, file), dest);
  }

  console.log(chalk.hex('#64748B')(`  Backup: ${backupDir} (${files.length} files)`));
  return backupDir;
}
