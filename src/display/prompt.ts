import { checkbox, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';
import type { BreakingChange } from '../types/index.js';

const SEVERITY_COLORS: Record<string, string> = {
  high: '#F87171',
  medium: '#FBBF24',
  low: '#4ADE80',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export async function gatherMissingInput(options: {
  library?: string;
  from?: string;
  to?: string;
  dir: string;
  interactive: boolean;
}): Promise<{ library: string; fromVersion: string; toVersion: string; projectDir: string }> {
  if (!options.interactive && (!options.library || !options.from || !options.to)) {
    throw new Error('Non-interactive mode requires library, --from, and --to.');
  }

  const library = options.library
    ?? await input({ message: 'Library name (e.g. react, next, tailwindcss):', validate: v => v.length > 0 || 'Required' });
  const fromVersion = options.from
    ?? await input({ message: `Current version of ${library}:`, validate: v => v.length > 0 || 'Required' });
  const toVersion = options.to
    ?? await input({ message: `Target version of ${library}:`, validate: v => v.length > 0 || 'Required' });

  return { library, fromVersion, toVersion, projectDir: options.dir };
}

export async function selectBreakingChanges(
  changes: BreakingChange[],
  options: { interactive: boolean; all: boolean }
): Promise<BreakingChange[]> {
  if (changes.length === 0) {
    console.log(chalk.yellow('\n  No breaking changes detected. Migration may be straightforward.'));
    return [];
  }

  console.log(chalk.hex('#4ADE80')(`\n  Found ${changes.length} breaking changes\n`));

  if (options.all) {
    console.log(chalk.hex('#64748B')('  --all enabled: selecting every breaking change.'));
    return changes;
  }

  if (!options.interactive) {
    const selected = changes.filter(change => change.severity !== 'low');
    console.log(chalk.hex('#64748B')(`  Non-interactive mode: selected ${selected.length} high/medium changes.`));
    return selected;
  }

  const opts: Array<{ name: string; value: string; checked: boolean }> = [
    { name: chalk.hex('#4ADE80')('All breaking changes'), value: '__all__', checked: false },
  ];

  for (const change of changes) {
    const severityColor = SEVERITY_COLORS[change.severity] ?? '#FBBF24';
    const severityLabel = SEVERITY_LABELS[change.severity] ?? 'MED';
    opts.push({
      name: `${chalk.hex(severityColor)(severityLabel.padEnd(4))} ${change.title} ${chalk.hex('#64748B')(`[${change.severity}]`)}`,
      value: change.id,
      checked: change.severity !== 'low',
    });
  }

  const raw = await checkbox({
    message: 'Select breaking changes',
    choices: opts,
  }) as string[];
  const selected = raw.filter((value: string | undefined): value is string => value != null);

  if (selected.includes('__all__')) return changes;
  return changes.filter(change => selected.includes(change.id));
}

export async function confirmApply(totalFiles: number, totalChanges: number): Promise<boolean> {
  return confirm({
    message: `Apply ${totalChanges} changes across ${totalFiles} files?`,
    default: false,
  });
}
