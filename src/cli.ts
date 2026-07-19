#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { displayWelcome } from './display/welcome.js';
import { enhancedScanProject, displayEnhancedScan } from './scanner/project-scanner.js';
import { fetchMigrationGuide } from './parser/changelog-fetcher.js';
import { parseBreakingChanges } from './parser/breaking-change-parser.js';
import { generateFixtures } from './generator/fixture-generator.js';
import { generateTransforms } from './generator/transform-generator.js';
import { validateTransforms } from './validator/edge-case-validator.js';
import { dryRunTransforms } from './executor/dry-run.js';
import { applyTransforms } from './executor/apply.js';
import { rollbackProject } from './executor/rollback.js';
import { gatherMissingInput, selectBreakingChanges } from './display/prompt.js';
import { reviewAndApply } from './display/diff-viewer.js';
import { displayMigrationReport } from './display/report.js';
import { hasApiKey } from './lib/openai-client.js';
import type { CliOptions } from './types/index.js';

const program = new Command();

program
  .name('forge')
  .description('The AI Software Migration Engineer. Modernize any repository safely.')
  .version('0.3.0');

// ── analyze ──────────────────────────────────────────────────────────
program
  .command('analyze')
  .description('Analyze a repository: detect frameworks, count components, find deprecated APIs, score health')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (opts) => {
    const dir = typeof opts.dir === 'string' ? opts.dir : process.cwd();
    displayWelcome();
    console.log(chalk.hex('#B4A0FF')('  Repository Intelligence Agent: scanning project...'));
    const scan = await enhancedScanProject(dir);
    displayEnhancedScan(scan);
  });

// ── plan ─────────────────────────────────────────────────────────────
program
  .command('plan')
  .description('Fetch migration guide, extract breaking changes, and show a migration plan')
  .argument('<library>', 'Library name (e.g. react, next, tailwindcss)')
  .option('-f, --from <version>', 'Current version')
  .option('-t, --to <version>', 'Target version')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-g, --guide <url>', 'Migration guide URL')
  .option('--all', 'Select every detected breaking change', false)
  .action(async (library: string, opts) => {
    const dir = typeof opts.dir === 'string' ? opts.dir : process.cwd();
    const from = typeof opts.from === 'string' ? opts.from : undefined;
    const to = typeof opts.to === 'string' ? opts.to : undefined;
    const guide = typeof opts.guide === 'string' ? opts.guide : undefined;

    displayWelcome();

    const gathered = await gatherMissingInput({ library, from, to, dir, interactive: true });

    console.log(chalk.hex('#B4A0FF')('  Discovery Agent: mining migration guidance...'));
    const guideResult = await fetchMigrationGuide(
      gathered.library, gathered.fromVersion, gathered.toVersion, guide,
    );
    console.log(chalk.hex('#64748B')(`    Source: ${guideResult.sourceUrl}`));
    console.log(chalk.hex('#64748B')(`    Title:  ${guideResult.title}`));

    if (!hasApiKey()) {
      console.log(chalk.yellow('\n  OPENAI_API_KEY is not set. Set it with: export OPENAI_API_KEY=***'));
      process.exit(0);
    }

    console.log(chalk.hex('#B4A0FF')('\n  Planning Agent: extracting breaking changes with GPT-5.6...'));
    const changes = await parseBreakingChanges(
      guideResult.content, gathered.library, gathered.fromVersion, gathered.toVersion,
    );

    const cyan = chalk.hex('#00D9FF');
    const green = chalk.hex('#4ADE80');
    const amber = chalk.hex('#FBBF24');
    const gray = chalk.hex('#64748B');
    const white = chalk.hex('#F1F5F9');

    console.log('');
    console.log(cyan('  AI Migration Plan'));
    console.log(cyan('  ' + '='.repeat(50)));

    for (const c of changes) {
      const sevColor =
        c.severity === 'high' ? chalk.hex('#F87171')
        : c.severity === 'medium' ? amber
        : green;
      console.log(`  ${green('+')} ${white(c.title)}  ${sevColor(`[${c.severity}]`)}`);
      console.log(gray(`      ${c.description.slice(0, 100)}${c.description.length > 100 ? '...' : ''}`));
      console.log(gray(`      Patterns: ${c.affectedPatterns.join(', ')}`));
    }

    console.log('');
    console.log(gray(`  ${changes.length} breaking change(s) detected.`));
    console.log(gray('  Run  forge migrate  to execute the full migration pipeline.\n'));
  });

// ── migrate ──────────────────────────────────────────────────────────
program
  .command('migrate')
  .description('Full migration pipeline: plan, generate transforms, validate, dry-run, and apply')
  .argument('[library]', 'Library name (e.g. react, next, tailwindcss)')
  .option('-f, --from <version>', 'Current version')
  .option('-t, --to <version>', 'Target version')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-g, --guide <url>', 'Migration guide URL')
  .option('--dry-run', 'Preview changes without applying', false)
  .option('--all', 'Select every detected breaking change', false)
  .option('-y, --yes', 'Apply every safe result without prompts', false)
  .option('--no-interactive', 'Run non-interactively')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (library: string | undefined, opts) => {
    const options: CliOptions = {
      library,
      from: typeof opts.from === 'string' ? opts.from : undefined,
      to: typeof opts.to === 'string' ? opts.to : undefined,
      guide: typeof opts.guide === 'string' ? opts.guide : undefined,
      dir: typeof opts.dir === 'string' ? opts.dir : process.cwd(),
      dryRun: opts.dryRun === true,
      interactive: opts.interactive !== false,
      all: opts.all === true,
      yes: opts.yes === true,
      verbose: opts.verbose === true,
    };

    try {
      await runMigration(options);
    } catch (error) {
      console.error(chalk.red('\n  Fatal error:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(chalk.hex('#64748B')(error.stack));
      }
      process.exit(1);
    }
  });

// ── verify ───────────────────────────────────────────────────────────
program
  .command('verify')
  .description('Re-run existing transforms in dry-run mode to verify they still work')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .action(async (opts) => {
    const dir = typeof opts.dir === 'string' ? opts.dir : process.cwd();
    displayWelcome();
    console.log(chalk.hex('#B4A0FF')('  Verify Agent: re-running transforms in dry-run mode...'));
    console.log(chalk.hex('#64748B')(`  Project: ${dir}`));
    console.log(chalk.hex('#64748B')('  This command will be fully wired once transforms exist.\n'));
  });

// ── rollback ─────────────────────────────────────────────────────────
program
  .command('rollback')
  .description('Restore project files from the most recent backup')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .action(async (opts) => {
    const dir = typeof opts.dir === 'string' ? opts.dir : process.cwd();
    displayWelcome();
    await rollbackProject(dir);
  });

// ── report ───────────────────────────────────────────────────────────
program
  .command('report')
  .description('Display the migration report from the last run')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .action(async (_opts) => {
    displayWelcome();
    console.log(chalk.hex('#B4A0FF')('  Report Agent: loading last migration report...'));
    console.log(chalk.hex('#64748B')('  Reports are generated after a  forge migrate  run.\n'));
  });

// ── top-level shorthand: forge <library> ─────────────────────────────
program
  .argument('[library]', 'Library name (e.g. react, next, tailwindcss)')
  .option('-f, --from <version>', 'Current version')
  .option('-t, --to <version>', 'Target version')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-g, --guide <url>', 'Migration guide URL')
  .option('--dry-run', 'Preview changes without applying', false)
  .option('--all', 'Select every detected breaking change', false)
  .option('-y, --yes', 'Apply every safe result without prompts', false)
  .option('--no-interactive', 'Run non-interactively')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (library: string | undefined, opts) => {
    if (!library) return;

    const options: CliOptions = {
      library,
      from: typeof opts.from === 'string' ? opts.from : undefined,
      to: typeof opts.to === 'string' ? opts.to : undefined,
      guide: typeof opts.guide === 'string' ? opts.guide : undefined,
      dir: typeof opts.dir === 'string' ? opts.dir : process.cwd(),
      dryRun: opts.dryRun === true,
      interactive: opts.interactive !== false,
      all: opts.all === true,
      yes: opts.yes === true,
      verbose: opts.verbose === true,
    };

    try {
      await runMigration(options);
    } catch (error) {
      console.error(chalk.red('\n  Fatal error:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(chalk.hex('#64748B')(error.stack));
      }
      process.exit(1);
    }
  });

// ── Core migration pipeline ─────────────────────────────────────────
async function runMigration(opts: CliOptions): Promise<void> {
  const start = Date.now();
  displayWelcome();

  const { library, fromVersion, toVersion, projectDir } = await gatherMissingInput({
    library: opts.library,
    from: opts.from,
    to: opts.to,
    dir: opts.dir,
    interactive: opts.interactive,
  });

  // Step 1: Repository Intelligence
  const scan = await enhancedScanProject(projectDir);
  displayEnhancedScan(scan);

  // Step 2: Discovery
  console.log(chalk.hex('#B4A0FF')('  Discovery Agent: mining migration guidance...'));
  const guide = await fetchMigrationGuide(library, fromVersion, toVersion, opts.guide);
  console.log(chalk.hex('#64748B')(`    Source: ${guide.sourceUrl}`));
  console.log(chalk.hex('#64748B')(`    Title:  ${guide.title}`));

  if (!hasApiKey()) {
    console.log(chalk.yellow('\n  OPENAI_API_KEY is not set, so GPT-5.6 parsing cannot run.'));
    console.log(chalk.hex('#64748B')('  Set it with: export OPENAI_API_KEY=***'));
    process.exit(0);
  }

  // Step 3: Planning
  console.log(chalk.hex('#B4A0FF')('\n  Planning Agent: extracting breaking changes with GPT-5.6...'));
  const allChanges = await parseBreakingChanges(guide.content, library, fromVersion, toVersion);
  const selected = await selectBreakingChanges(allChanges, {
    interactive: opts.interactive,
    all: opts.all,
  });

  if (selected.length === 0) {
    console.log(chalk.green('\n  No changes selected. Nothing to do.\n'));
    process.exit(0);
  }

  // Step 4: Fixtures
  console.log(chalk.hex('#B4A0FF')('\n  Fixture Agent: preparing before/after validation cases...'));
  const fixturesMap = new Map<string, ReturnType<typeof generateFixtures>[number]>();
  for (const change of selected) {
    const fixtures = generateFixtures(change);
    if (fixtures.length > 0) {
      fixturesMap.set(change.id, fixtures[0]!);
      console.log(chalk.hex('#64748B')(`    OK ${fixtures.length} fixture(s): ${change.title}`));
    } else {
      console.log(chalk.hex('#64748B')(`    No known fixture: ${change.title}. GPT-5.6 will synthesize.`));
    }
  }

  // Step 5: Transform Generation
  console.log(chalk.hex('#B4A0FF')(`\n  Transform Agent: generating ${selected.length} AST transform(s)...`));
  const transforms = await generateTransforms(selected, library, fixturesMap, projectDir);
  if (transforms.length === 0) {
    throw new Error('No transforms were generated. Re-run with --verbose and inspect the model output.');
  }

  // Step 6: Validation
  const validated = await validateTransforms(transforms);

  // Step 7: Dry Run
  const dryResults = await dryRunTransforms(validated, projectDir);
  const totalFiles = dryResults.reduce((sum, result) => sum + result.fileDiffs.length, 0);
  const totalChanges = dryResults.reduce((sum, result) => sum + result.totalChanges, 0);
  const sessionId = process.env.CODEX_SESSION_ID || 'pending: add your /feedback session id';

  if (totalFiles === 0) {
    console.log(chalk.green('\n  No files need changes. Your codebase may already be compatible.\n'));
    displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
    process.exit(0);
  }

  if (opts.dryRun) {
    console.log(chalk.hex('#64748B')(`\n  Dry run complete: ${totalFiles} files would change (${totalChanges} edit groups).`));
    console.log(chalk.hex('#64748B')('  Run without --dry-run to apply approved transforms.\n'));
    displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
    process.exit(0);
  }

  // Step 8: Review & Apply
  const approved = await reviewAndApply(dryResults, { yes: opts.yes });
  if (approved.length > 0) {
    console.log(chalk.hex('#B4A0FF')('\n  Apply Agent: writing approved transforms with backup...'));
    await applyTransforms(approved, projectDir);
  }

  displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
}

program.parse();
