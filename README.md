# CodeMod Forge

**The AI Software Migration Engineer**

CodeMod Forge understands your repository, plans a safe migration, explains every change, executes it across the codebase, and produces a review-ready pull request with measurable impact.

```bash
forge migrate react --from 17 --to 19 --dir ./demo --all --dry-run
```

## Why It Matters

Teams postpone framework and SDK upgrades because migrations are tedious, risky, and hard to review. A static codemod only works when somebody already knew the exact pattern. CodeMod Forge turns the migration guide itself into an executable, reviewable migration loop with full trust layer, rollback, and impact reporting.

## Features

### Browser Experience

A 7-step interactive workflow — no chat-first UI, no prompt box. The repository is the hero.

1. **Landing** — Connect GitHub, Upload Repository, or Try Demo
2. **Repository Analysis** — Animated progress scanning architecture, dependencies, security, and migration opportunities
3. **Intelligence Dashboard** — Health Score, Migration Readiness, Estimated Savings, AI Confidence, Risk Level, PR Size
4. **AI Migration Plan** — Expandable step-by-step plan with per-step risk and file counts
5. **Trust Layer** — Every file change with reason, risk, confidence, rollback status, affected tests, and dependencies
6. **Preview** — Side-by-side before/after diff with AI summary
7. **Impact Report** — Before/after metrics showing measurable improvement

### CLI

Premium subcommand experience:

```text
forge analyze         Scan repository, detect frameworks, score health
forge plan <lib>      Extract breaking changes and show migration plan
forge migrate <lib>   Full pipeline: plan, generate, validate, dry-run, apply
forge verify          Re-run transforms to verify they still work
forge rollback        Restore from most recent backup
forge report          Display migration report from last run
```

### Core Engine

- Mines built-in migration guides for React, Next.js, Tailwind CSS, Vue, Express, Prisma, and TypeScript
- Accepts arbitrary migration guide URLs with `--guide <url>`
- Uses GPT-5.6 to extract structured breaking changes
- Generates real ts-morph transforms with exported `detect()` and `apply()` functions
- Tests generated transforms against before/after fixtures
- Re-runs generation when fixture validation fails
- Runs independent GPT-5.6 edge-case review with confidence scoring
- Executes transforms in memory before touching disk
- Writes timestamped backups under `.codemod-forge/`
- Repository Intelligence: health score, component counting, deprecated API detection, security scanning

## Quick Start

```bash
npm install
npm run build
```

Set your OpenAI API key:

```bash
# macOS/Linux
export OPENAI_API_KEY=sk-...

# PowerShell
$env:OPENAI_API_KEY="sk-..."
```

### Analyze a project

```bash
npm run dev -- analyze --dir ./demo
```

### Run the full migration pipeline (dry-run)

```bash
npm run dev -- migrate react --from 17 --to 19 --dir ./demo --all --dry-run
```

### Run with auto-apply

```bash
npm run dev -- migrate react --from 17 --to 19 --dir ./demo --all --yes
```

### Use a custom migration guide

```bash
npm run dev -- migrate my-library --from 1 --to 2 --dir ./my-app --guide https://example.com/migration-guide --all --dry-run
```

### Rollback

```bash
npm run dev -- rollback --dir ./demo
```

## CLI Reference

```text
Usage: forge [options] [command] [library]

The AI Software Migration Engineer. Modernize any repository safely.

Commands:
  analyze [options]            Analyze repository: frameworks, components, deprecated APIs, health
  plan [options] <library>     Fetch migration guide, extract breaking changes, show plan
  migrate [options] [library]  Full migration pipeline: plan, generate, validate, dry-run, apply
  verify [options]             Re-run existing transforms in dry-run mode
  rollback [options]           Restore project files from most recent backup
  report [options]             Display migration report from last run

Options:
  -V, --version                output the version number
  -f, --from <version>         Current version
  -t, --to <version>           Target version
  -d, --dir <path>             Project directory (default: current directory)
  -g, --guide <url>            Migration guide URL
  --dry-run                    Preview changes without applying
  --all                        Select every detected breaking change
  -y, --yes                    Apply every safe result without prompts
  --no-interactive             Run non-interactively
  -v, --verbose                Verbose output
  -h, --help                   display help for command
```

## Architecture

```text
src/
  cli.ts                         Commander.js entry with subcommands
  scanner/project-scanner.ts     Enhanced scanner: health, components, deprecated APIs, security
  parser/
    changelog-fetcher.ts         Fetches built-in guides or custom --guide URL
    breaking-change-parser.ts    GPT-5.6 extracts structured breaking changes
  generator/
    fixture-generator.ts         Known before/after fixtures for common migrations
    transform-generator.ts       GPT-5.6 writes executable ts-morph transform files
  validator/
    edge-case-validator.ts       Independent GPT-5.6 review and confidence score
  executor/
    transform-loader.ts          In-memory TypeScript transform loader
    dry-run.ts                   Executes transforms in memory and collects diffs
    apply.ts                     Applies approved transforms
    backup.ts                    Backs up originals under .codemod-forge/
    rollback.ts                  Restores from most recent backup
  display/
    welcome.ts                   Premium CLI banner
    prompt.ts                    Interactive and non-interactive selection
    diff-viewer.ts               Diff preview and approval flow
    report.ts                    Migration impact report with before/after metrics
  types/index.ts                 Shared TypeScript interfaces
  lib/openai-client.ts           Centralized OpenAI client

web/
  index.html                     7-step browser experience (Vercel-deployed)
```

## Agentic Workflow

1. **Repository Intelligence Agent** — Scans project, detects frameworks, counts components, finds deprecated APIs, scores health
2. **Discovery Agent** — Mines a migration guide
3. **Planning Agent** — Extracts breaking changes
4. **Fixture Agent** — Prepares before/after validation cases
5. **Transform Agent** — Writes executable ts-morph code
6. **Validator Agent** — Independent GPT-5.6 review
7. **Dry-run Agent** — Executes in memory and shows diffs
8. **Apply Agent** — Writes approved changes with backup
9. **Rollback Agent** — Restores from backup with one command

## Demo Project

The `demo/` folder is a small React 17 codebase with patterns that commonly need migration:

- `forwardRef` components
- generic `forwardRef` usage
- `propTypes`
- `defaultProps`
- `useRef<T>()` calls without initial values
- `React.PropsWithChildren`

## How Codex Was Used

Codex was used as the primary engineering partner to build and harden the project during OpenAI Build Week — designing the agent pipeline, implementing the 7-step browser experience, building the enhanced project scanner, structuring the CLI subcommands, and preparing the deploy-ready package.

## How GPT-5.6 Is Used

GPT-5.6 powers the semantic reasoning layer:

- Parses raw migration-guide text into breaking changes
- Generates ts-morph transform code from each change
- Repairs transform code when fixture tests fail
- Performs independent edge-case review
- Produces confidence reasons explaining why a transform is safe or blocked

## Build and Package

```bash
npm run lint
npm run build
npm run pack:local
```

## Browser Deployment

The `web/` folder deploys to Vercel as a static site:

```json
{
  "outputDirectory": "web",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## License

MIT
