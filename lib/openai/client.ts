import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model config — gpt-4o-mini for all v1 calls (extraction, summarization, chat)
export const AI_MODEL = 'gpt-4o-mini' as const;
