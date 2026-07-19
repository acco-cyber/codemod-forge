import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { createTwoFilesPatch } from 'diff';
import type { DryRunResult, Transform } from '../types/index.js';

export async function reviewTransform(result: DryRunResult): Promise<'apply' | 'skip'> {
  const transform = result.transform;
  const files = result.fileDiffs.length;
  const changes = result.totalChanges;

  console.log(
    `\n  ${chalk.hex('#00D9FF')(transform.description)}  `
    + chalk.hex('#64748B')(`- ${files} files, ${changes} changes`)
  );

  if (typeof transform.confidenceScore === 'number') {
    console.log(
      `  ${chalk.hex('#B4A0FF')(`Confidence ${transform.confidenceScore}%`)}  `
      + chalk.hex('#64748B')(transform.confidenceReason ?? '')
    );
  }

  for (const error of result.errors) {
    console.log(`  ${chalk.red('FAIL')} ${chalk.hex('#64748B')(error.message)}`);
  }

  for (const diff of result.fileDiffs.slice(0, 3)) {
    showCompactDiff(diff);
  }

  if (result.fileDiffs.length > 3) {
    console.log(chalk.hex('#64748B')(`  ... and ${result.fileDiffs.length - 3} more files`));
  }

  if (files === 0 || result.errors.length > 0 || transform.safeToApply === false) {
    return 'skip';
  }

  const apply = await confirm({
    message: 'Apply this transform?',
    default: true,
  });

  return apply ? 'apply' : 'skip';
}

function showCompactDiff(diff: DryRunResult['fileDiffs'][0]): void {
  const shortPath = diff.filePath.replace(/^.*?[\\/]/g, '/').split('/').slice(-3).join('/');
  console.log(chalk.hex('#64748B')(`\n  File: ${shortPath}`));

  const patch = createTwoFilesPatch(
    shortPath,
    shortPath,
    diff.original,
    diff.modified,
    'BEFORE',
    'AFTER'
  );

  const lines = patch.split('\n').slice(4);
  for (const line of lines.slice(0, 15)) {
    if (line.startsWith('+')) console.log(chalk.hex('#4ADE80')(`  ${line}`));
    else if (line.startsWith('-')) console.log(chalk.hex('#F87171')(`  ${line}`));
    else if (line.startsWith('@@')) console.log(chalk.hex('#B4A0FF')(`  ${line}`));
    else console.log(chalk.hex('#333D4A')(`  ${line}`));
  }

  if (lines.length > 15) {
    console.log(chalk.hex('#64748B')(`  ... ${lines.length - 15} more lines`));
  }
}

export async function reviewAndApply(
  results: DryRunResult[],
  options: { yes: boolean }
): Promise<Transform[]> {
  const approved: Transform[] = [];

  for (const result of results) {
    const canApply = result.fileDiffs.length > 0
      && result.errors.length === 0
      && !result.transform.skipped
      && result.transform.safeToApply !== false;

    const action = options.yes
      ? (canApply ? 'apply' : 'skip')
      : await reviewTransform(result);

    if (action === 'apply') {
      result.transform.applied = true;
      result.transform.skipped = false;
      approved.push(result.transform);
    } else {
      result.transform.applied = false;
      result.transform.skipped = true;
    }
  }

  if (options.yes) {
    console.log(chalk.hex('#64748B')(`\n  --yes enabled: approved ${approved.length} safe transform(s).`));
  }

  return approved;
}
