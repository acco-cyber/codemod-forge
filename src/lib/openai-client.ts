import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not set.\n' +
      '  Set it with: export OPENAI_API_KEY=sk-...\n' +
      '  Or create a .env file with OPENAI_API_KEY=sk-...'
    );
  }
  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL,
  });
  return _client;
}

export function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
