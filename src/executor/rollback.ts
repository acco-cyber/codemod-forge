import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/** Find the most recent backup directory under .codemod-forge/ */
async function findLatestBackup(projectDir: string): Promise<string | null> {
  const forgeDir = path.join(projectDir, '.codemod-forge');
  try {
    const entries = await fs.readdir(forgeDir, { withFileTypes: true });
    const backups = entries
      .filter(e => e.isDirectory() && e.name.startsWith('backup-'))
      .map(e => e.name)
      .sort()
      .reverse();

    return backups.length > 0 ? path.join(forgeDir, backups[0]!) : null;
  } catch {
    return null;
  }
}

/** Restore files from the most recent backup. */
export async function rollbackProject(projectDir: string): Promise<void> {
  const cyan = chalk.hex('#00D9FF');
  const green = chalk.hex('#4ADE80');
  const gray = chalk.hex('#64748B');

  console.log(cyan('\n  Rollback Agent'));
  console.log(cyan('  ' + '='.repeat(50)));

  const backupDir = await findLatestBackup(projectDir);
  if (!backupDir) {
    console.log(chalk.yellow('\n  No backup found. Nothing to rollback.'));
    console.log(gray('  Backups are created automatically when transforms are applied.\n'));
    return;
  }

  console.log(gray(`  Restoring from: ${backupDir}`));

  const files = await collectBackupFiles(backupDir, backupDir);
  let restored = 0;

  for (const relPath of files) {
    const src = path.join(backupDir, relPath);
    const dest = path.join(projectDir, relPath);
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      restored++;
    } catch (error) {
      console.log(chalk.red(`  FAIL ${relPath}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  console.log(green(`\n  Restored ${restored} file(s) from backup.`));
  console.log(gray('  Your project has been rolled back to the pre-migration state.\n'));
}

async function collectBackupFiles(dir: string, root: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectBackupFiles(full, root);
      result.push(...nested);
    } else {
      result.push(path.relative(root, full));
    }
  }

  return result;
}
