# Devpost Submission Draft

## Project Name

CodeMod Forge

## Track

Developer Tools

## Tagline

The AI Software Migration Engineer that understands your repository, plans a safe migration, explains every change, and produces a review-ready pull request with measurable impact.

## Short Description

CodeMod Forge is an autonomous migration engineer for library upgrades. It mines migration guides, uses GPT-5.6 to extract breaking changes, generates executable ts-morph transforms, validates them against fixtures, performs an independent GPT-5.6 edge-case review, runs every transform in memory, and applies only approved changes with backup and rollback. It includes a 7-step browser experience for visual exploration and a premium CLI with dedicated subcommands.

## What It Does

- **Repository Intelligence** — Scans projects to detect frameworks, count components, find deprecated APIs, measure security issues, and calculate a health score.
- **Discovery** — Fetches built-in migration guides or a custom `--guide <url>`.
- **Planning** — Extracts structured breaking changes with GPT-5.6.
- **Transform Generation** — Generates executable TypeScript AST transforms with fixture testing and auto-regeneration on failure.
- **Independent Review** — Second GPT-5.6 pass for false positives, false negatives, type safety, and confidence scoring.
- **Dry-run Preview** — Executes in memory and shows file-level diffs before touching disk.
- **Trust Layer** — Every change explained with reason, risk, confidence, rollback status, and affected tests.
- **Impact Report** — Before/after metrics: health score, deprecated APIs, security issues, time saved.
- **Rollback** — One-command restore from timestamped backup.
- **Browser Experience** — 7-step interactive workflow deployed on Vercel.

## Why It Matters

Framework and SDK upgrades are expensive because teams must read release notes, identify every affected pattern, edit code safely, and review the risk. Static codemods help only when a maintainer already wrote the exact transform. CodeMod Forge is a more general workflow: an AI migration engineer that turns documentation into tested, reviewable AST edits with measurable impact.

## How We Used Codex

Codex was the build partner for the entire project. It designed the agent pipeline, built the enhanced project scanner, structured the CLI subcommands, implemented the 7-step browser experience, created the trust layer and impact report, and prepared the deploy-ready package.

Add the primary `/feedback` Codex Session ID here before submitting:

```text
CODEX_FEEDBACK_SESSION_ID=PASTE_HERE
```

## How We Used GPT-5.6

GPT-5.6 powers the semantic reasoning layer:

- Reads raw migration-guide text and extracts breaking changes
- Writes executable ts-morph transform code
- Repairs transform code after failed fixture checks
- Independently reviews generated transforms for edge cases
- Produces confidence reasons that explain whether a transform is safe or blocked

## Judge Testing Instructions

Requirements:

- Node.js 18+
- OpenAI API key in `OPENAI_API_KEY`

### Quick test (analyze only, no API key needed)

```bash
npm install
npm run build
node dist/cli.js analyze --dir ./demo
```

### Full migration demo (requires API key)

```bash
npm run dev -- migrate react --from 17 --to 19 --dir ./demo --all --dry-run
```

### Apply flow after reviewing dry-run

```bash
npm run dev -- migrate react --from 17 --to 19 --dir ./demo --all --yes
```

### Rollback

```bash
npm run dev -- rollback --dir ./demo
```

### Browser demo

Open `web/index.html` in a browser and click "Try Demo" to experience the full 7-step flow.

## Demo Video Script Under 3 Minutes

0:00 - 0:15: Problem

"Library migrations are still manual. Teams read release notes, hunt patterns, edit hundreds of files, and hope they didn't miss an edge case."

0:15 - 0:30: Product

"CodeMod Forge is the AI Software Migration Engineer. It understands your repository, plans a safe migration, explains every change, and produces a review-ready pull request with measurable impact."

0:30 - 0:50: Browser demo

Open the browser experience. Show: Landing, Repository Analysis (animated), Intelligence Dashboard (health 82, readiness 95%), AI Plan, Trust Layer, Preview diff, Impact Report (health 82 → 97).

0:50 - 1:45: CLI demo

```bash
forge analyze --dir ./demo
forge migrate react --from 17 --to 19 --dir ./demo --all --dry-run
```

Show: premium banner, repository intelligence, breaking change extraction, transform generation, validator confidence, dry-run diffs, impact report.

1:45 - 2:20: Architecture

"GPT-5.6 handles semantic reasoning. Deterministic tooling handles AST execution, fixture checks, diffs, backups, and rollback."

2:20 - 2:45: Impact

"This generalizes from React to any library. The input is the breaking-change specification, not a hardcoded codemod. One-command rollback builds trust."

2:45 - 3:00: Close

"Not a codemod generator. The AI Software Migration Engineer for repository evolution."

## Submission Checklist

- [ ] Public repo URL, or private repo shared with required judge emails
- [ ] Public YouTube demo video under 3 minutes
- [ ] README includes setup and judge testing commands
- [ ] `/feedback` Codex Session ID is included
- [ ] `OPENAI_API_KEY` requirement is documented
- [ ] MIT license is present
- [ ] Browser experience deployed from `web/`
