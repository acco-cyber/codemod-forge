# Codemod Forge - AGENTS.md

This project is an autonomous migration engineer for library upgrades. It reads release notes or migration guides, extracts breaking changes with GPT-5.6, generates executable ts-morph codemods, validates them against fixtures and an independent GPT-5.6 review, shows a dry-run diff, and applies only approved changes with backup.

Primary demo commands:

```bash
forge analyze --dir ./demo
forge migrate react --from 17 --to 19 --dir ./demo --all --dry-run
```

## Architecture

```text
src/
  cli.ts                         Commander.js entry with subcommands
  scanner/project-scanner.ts     Enhanced scanner: health, components, deprecated APIs, security
  parser/
    changelog-fetcher.ts         Fetches built-in guides or a user-provided --guide URL
    breaking-change-parser.ts    GPT-5.6 extracts structured breaking changes
  generator/
    fixture-generator.ts         Known before/after fixtures for common migrations
    transform-generator.ts       GPT-5.6 writes executable ts-morph transform files
  validator/
    edge-case-validator.ts       Independent GPT-5.6 transform review and confidence score
  executor/
    transform-loader.ts          In-memory TypeScript transform loader
    dry-run.ts                   Executes transforms in memory and collects diffs
    apply.ts                     Applies approved transforms
    backup.ts                    Backs up originals under .codemod-forge/
    rollback.ts                  Restores from most recent backup
  display/
    welcome.ts                   Premium CLI banner
    prompt.ts                    Interactive and non-interactive selection helpers
    diff-viewer.ts               Diff preview and approval flow
    report.ts                    Migration impact report with before/after metrics
  types/index.ts                 Shared TypeScript interfaces
  lib/openai-client.ts           Centralized OpenAI client

web/
  index.html                     7-step browser experience (Vercel-deployed)
```

## Coding Standards

- TypeScript strict mode.
- Prefer ts-morph AST APIs over string rewrites.
- Keep generated transforms in the target project's `.codemod-forge/transforms/` folder.
- Do not write to user files until dry-run succeeds and the transform is approved.
- Preserve useful terminal output, but keep it ASCII-safe for PowerShell, CI, and judge environments.
- Errors should explain what failed and what the user can do next.

## Product Story

Frame the product as "The AI Software Migration Engineer," not just a codemod generator:

1. Repository Intelligence Agent scans the project.
2. Discovery Agent mines a migration guide.
3. Planning Agent extracts breaking changes.
4. Fixture Agent prepares before/after validation cases.
5. Transform Agent writes executable ts-morph code.
6. Validator Agent performs an independent GPT-5.6 review.
7. Dry-run Agent executes in memory and shows diffs.
8. Apply Agent writes approved changes after backup.
9. Rollback Agent restores from backup with one command.

## Commands

```bash
npm install
npm run lint
npm run build
npm run pack:local
npm run dev -- analyze --dir ./demo
npm run dev -- migrate react --from 17 --to 19 --dir ./demo --all --dry-run
npm run dev -- rollback --dir ./demo
```

## Do Not Do

- Do not mock production transform execution.
- Do not direct-import generated `.ts` files at runtime; use `transform-loader.ts`.
- Do not remove the demo folder from npm packaging.
- Do not invent benchmark numbers. Only show metrics the CLI actually reports.
