import fs from 'fs/promises';
import chalk from 'chalk';
import { getOpenAIClient } from '../lib/openai-client.js';
import type { Transform, ValidationIssue, ValidationResult } from '../types/index.js';

const SYSTEM_PROMPT = `You are an expert TypeScript static analysis engineer. Review this ts-morph AST transform and find edge cases it might miss or incorrectly handle.

Check for:
1. False positives: patterns it would incorrectly modify.
2. False negatives: patterns it would miss.
3. Type safety breaks: ways it could break TypeScript checking.
4. Nested structures: JSX children, HOCs, callbacks, and wrapper functions.
5. Import side effects: cases where import edits could break runtime behavior.

Return JSON only:
{
  "issues": [
    {"line": number, "description": "...", "suggestion": "...", "severity": "critical"|"warning"}
  ],
  "safeToApply": boolean
}`;

function parseValidationResponse(content: string | null): { issues: ValidationIssue[]; safeToApply: boolean } {
  if (!content) return { issues: [], safeToApply: true };
  try {
    const parsed = JSON.parse(content);
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    return {
      issues,
      safeToApply: parsed.safeToApply !== false,
    };
  } catch {
    return {
      issues: [{
        line: 1,
        description: 'Validator returned invalid JSON.',
        suggestion: 'Review this transform manually before applying.',
        severity: 'warning',
      }],
      safeToApply: true,
    };
  }
}

function buildConfidence(transform: Transform, issues: ValidationIssue[], safeToApply: boolean): {
  score: number;
  reason: string;
  criticalCount: number;
} {
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
  const warningCount = issues.length - criticalCount;
  let score = 94;

  if (transform.fixtureCount === 0) score -= 18;
  score -= criticalCount * 25;
  score -= warningCount * 8;
  if (!safeToApply) score = Math.min(score, 68);

  score = Math.max(0, Math.min(99, score));

  const reasonParts = [
    `${transform.fixtureCount} fixture${transform.fixtureCount === 1 ? '' : 's'} passed`,
    criticalCount === 0 ? 'no critical validator issues' : `${criticalCount} critical issue(s)`,
    warningCount === 0 ? 'no warnings' : `${warningCount} warning(s)`,
  ];

  return {
    score,
    reason: reasonParts.join('; '),
    criticalCount,
  };
}

export async function validateTransform(transform: Transform): Promise<ValidationResult> {
  const openai = getOpenAIClient();
  const source = await fs.readFile(transform.sourceFile, 'utf-8');

  const response = await openai.chat.completions.create({
    model: 'gpt-5.6',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Transform:\n\`\`\`ts\n${source}\n\`\`\`` },
    ],
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const parsed = parseValidationResponse(response.choices[0]?.message?.content ?? null);
  return { transform, issues: parsed.issues, safeToApply: parsed.safeToApply };
}

export async function validateTransforms(transforms: Transform[]): Promise<Transform[]> {
  console.log(chalk.hex('#B4A0FF')('\nIndependent GPT-5.6 validator review...\n'));
  let edgeCasesTotal = 0;

  for (const transform of transforms) {
    const result = await validateTransform(transform);
    const confidence = buildConfidence(transform, result.issues, result.safeToApply);

    transform.safeToApply = result.safeToApply && confidence.criticalCount === 0;
    transform.confidenceScore = confidence.score;
    transform.confidenceReason = confidence.reason;
    transform.validationIssueCount = result.issues.length;
    transform.criticalIssueCount = confidence.criticalCount;
    transform.skipped = !transform.safeToApply;

    if (result.issues.length > 0) {
      edgeCasesTotal += result.issues.length;
      const status = transform.safeToApply ? 'WARN' : 'BLOCK';
      console.log(
        chalk.yellow(`  ${status} ${transform.description} - ${result.issues.length} edge case(s), confidence ${confidence.score}%`)
      );
      for (const issue of result.issues) {
        console.log(chalk.hex('#64748B')(`     ${issue.description}`));
        console.log(chalk.hex('#64748B')(`     Fix: ${issue.suggestion}`));
      }
    } else {
      console.log(chalk.green(`  OK ${transform.description} - confidence ${confidence.score}%`));
    }
  }

  if (edgeCasesTotal > 0) {
    console.log(chalk.hex('#64748B')(`\n  ${edgeCasesTotal} validator edge case(s) recorded.\n`));
  }

  return transforms;
}
