import ora from 'ora';
import chalk from 'chalk';

export function createSpinner(label: string) {
  return ora({
    text: chalk.hex('#00D9FF')(label),
    spinner: 'dots',
    color: 'cyan',
  });
}

export interface GenerationProgress {
  current: number;
  total: number;
  label: string;
}

export function renderProgressBar(progress: GenerationProgress): string {
  const filled = Math.floor((progress.current / progress.total) * 20);
  const bar = '#'.repeat(filled);
  const empty = '-'.repeat(20 - filled);
  const status = progress.current === progress.total ? chalk.green(' done') : '';

  return `  [${chalk.hex('#00D9FF')(bar)}${chalk.hex('#334155')(empty)}] ${progress.current}/${progress.total}${status}  ${chalk.hex('#64748B')(progress.label)}`;
}
