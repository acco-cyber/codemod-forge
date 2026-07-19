import { getOpenAIClient } from '../lib/openai-client.js';
import type { BreakingChange } from '../types/index.js';

const SYSTEM_PROMPT = `You are an expert library migration analyzer. Extract ALL breaking changes from a migration guide as structured JSON.

For each breaking change include:
- "title": short summary
- "description": what changed and why it matters
- "severity": "high" (breaks builds), "medium" (requires code changes), "low" (optional/cosmetic)
- "category": "api-rename" | "removed-export" | "behavior-change" | "new-requirement" | "deprecated"
- "affectedPatterns": array of AST-level search strings (e.g. "forwardRef(...)" string, "import { PropTypes }")
- "migrationSteps": concise instructions for the code change

Return JSON: {"changes": [...]}. No markdown, no explanation.`;

export async function parseBreakingChanges(
  guideContent: string,
  library: string,
  fromVersion: string,
  toVersion: string
): Promise<BreakingChange[]> {
  const openai = getOpenAIClient();
  const prompt = `Library: ${library}\nFrom version: ${fromVersion}\nTo version: ${toVersion}\n\nMigration guide:\n${guideContent}\n\nExtract ALL breaking changes as JSON. Every change, no matter how small.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.6',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('GPT-5.6 returned empty response');

  const parsed = JSON.parse(content);
  const changes: any[] = parsed.changes || parsed || [];

  return changes.map((c: any, i: number) => ({
    id: `${library}-${fromVersion}-to-${toVersion}-${String(i + 1).padStart(2, '0')}`,
    title: c.title || '',
    description: c.description || '',
    severity: c.severity || 'medium',
    category: c.category || 'behavior-change',
    affectedPatterns: Array.isArray(c.affectedPatterns) ? c.affectedPatterns : [],
    migrationSteps: c.migrationSteps || '',
    sourceUrl: c.sourceUrl || '',
  }));
}
