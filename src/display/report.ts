import chalk from 'chalk';
import type { Transform } from '../types/index.js';

function averageConfidence(transforms: Transform[]): number {
  const scored = transforms.filter(transform => typeof transform.confidenceScore === 'number');
  if (scored.length === 0) return 0;
  const total = scored.reduce((sum, transform) => sum + (transform.confidenceScore ?? 0), 0);
  return Math.round(total / scored.length);
}

function estimateTimeSaved(transforms: Transform[]): number {
  // Estimate ~12 min per transform for manual migration
  const manualMinutes = transforms.length * 12;
  return Math.round((manualMinutes / 60) * 10) / 10;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function displayMigrationReport(
  transforms: Transform[],
  library: string,
  fromVersion: string,
  toVersion: string,
  codexSessionId: string,
  generationTime: number
): void {
  const applied = transforms.filter(transform => transform.applied);
  const skipped = transforms.filter(transform => transform.skipped);
  const filesChanged = applied.reduce((sum, transform) => sum + transform.affectedFiles, 0);
  const edgeCases = transforms.reduce((sum, transform) => sum + (transform.validationIssueCount ?? 0), 0);
  const critical = transforms.reduce((sum, transform) => sum + (transform.criticalIssueCount ?? 0), 0);
  const confidence = averageConfidence(transforms);
  const timeSaved = estimateTimeSaved(transforms);

  const cyan = chalk.hex('#00D9FF');
  const lavender = chalk.hex('#B4A0FF');
  const green = chalk.hex('#4ADE80');
  const amber = chalk.hex('#FBBF24');
  const gray = chalk.hex('#64748B');
  const white = chalk.hex('#F1F5F9');

  // Box border
  const line = '='.repeat(60);
  const dash = '-'.repeat(60);

  console.log('');
  console.log(cyan(`  ${line}`));
  console.log(cyan('  Migration Complete'));
  console.log(cyan(`  ${line}`));
  console.log('');

  // Migration summary
  console.log(`  ${white('Library')}         ${library} ${fromVersion} -> ${toVersion}`);
  console.log(`  ${white('Transforms')}      ${green(String(applied.length))} applied, ${skipped.length > 0 ? amber(String(skipped.length)) : gray('0')} skipped`);
  console.log(`  ${white('Files Changed')}   ${green(String(filesChanged))}`);
  console.log(`  ${white('Confidence')}      ${confidence > 0 ? lavender(`${confidence}%`) : gray('not scored')}`);
  console.log(`  ${white('Edge Cases')}      ${edgeCases} found, ${critical} critical`);
  console.log(`  ${white('Time Saved')}      ${green(`~${timeSaved} hours`)} (estimated manual effort)`);
  console.log(`  ${white('Elapsed')}         ${formatDuration(generationTime)}`);
  console.log('');

  // Transform details
  if (transforms.length > 0) {
    console.log(cyan(`  ${dash}`));
    console.log(cyan('  Transform Details'));
    console.log(cyan(`  ${dash}`));
    for (const transform of transforms) {
      const status = transform.applied
        ? green('APPLIED')
        : transform.skipped
          ? amber('SKIPPED')
          : gray('READY  ');
      const confidenceLabel = typeof transform.confidenceScore === 'number'
        ? lavender(`${String(transform.confidenceScore).padStart(3)}%`)
        : gray(' n/a');
      console.log(`  ${status} ${confidenceLabel}  ${white(transform.description)}`);
      if (transform.confidenceReason) {
        console.log(`               ${gray(transform.confidenceReason)}`);
      }
    }
  }

  // Impact
  console.log('');
  console.log(cyan(`  ${dash}`));
  console.log(cyan('  Impact'));
  console.log(cyan(`  ${dash}`));
  console.log(`  ${white('Deprecated APIs eliminated:')} ${green(String(applied.length))}`);
  console.log(`  ${white('Rollback available:')}         ${green('Yes')} (.codemod-forge/backup-*)`);
  console.log(`  ${white('Pull Request:')}               ${applied.length > 0 ? green('Ready') : gray('Pending')}`);
  console.log('');

  // Next steps
  console.log(cyan('  Next Steps'));
  console.log(gray('  1. Run your test suite to verify changes'));
  console.log(gray('  2. Review the generated diff'));
  console.log(gray('  3. Use  forge rollback  if anything went wrong'));
  console.log(gray('  4. Commit the migration once tests pass'));
  console.log(gray(`  5. Codex session: ${codexSessionId}`));
  console.log('');
}
