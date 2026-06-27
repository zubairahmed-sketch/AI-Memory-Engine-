import { openai, AI_MODEL } from '@/lib/openai/client';
import { createClient } from '@/lib/supabase/server';
import { logTokenUsage } from '@/lib/tokenTracking';

const COMPRESSION_PROMPT = `Given the previous summary and these new high-confidence facts, produce ONE updated summary (200-300 words) that replaces the old one. Preserve what's still relevant, drop what's stale or superseded. Write in third person about the user. Return only the summary text, no JSON wrapping.`;

// How many journal entries between summary compressions
const COMPRESSION_INTERVAL = 5;

export async function shouldCompress(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Count entries since last compression
  const { data: summary } = await supabase
    .from('memory_summary')
    .select('updated_at')
    .eq('user_id', userId)
    .single();

  const sinceDate = summary?.updated_at ?? '1970-01-01';

  const { count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('created_at', sinceDate);

  return (count ?? 0) >= COMPRESSION_INTERVAL;
}

export async function compressSummary(userId: string): Promise<string | null> {
  const supabase = await createClient();

  // Get existing summary
  const { data: existing } = await supabase
    .from('memory_summary')
    .select('summary_text, version')
    .eq('user_id', userId)
    .single();

  const previousSummary = existing?.summary_text ?? 'No previous summary exists yet.';
  const currentVersion = existing?.version ?? 0;

  // Get recent high-confidence facts (non-deprecated, confidence >= 0.5)
  const { data: facts } = await supabase
    .from('memories')
    .select('content, category, confidence')
    .eq('user_id', userId)
    .eq('is_deprecated', false)
    .gte('confidence', 0.5)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!facts || facts.length === 0) return previousSummary;

  const factsText = facts
    .map((f) => `- [${f.category}] ${f.content} (confidence: ${f.confidence})`)
    .join('\n');

  // Call 2: Summary Compression (gpt-4o-mini)
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: COMPRESSION_PROMPT },
      {
        role: 'user',
        content: `Previous summary:\n${previousSummary}\n\nNew facts:\n${factsText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logTokenUsage(userId, 'summary_compression', tokensUsed);

  const newSummary = completion.choices[0]?.message?.content?.trim();
  if (!newSummary) return previousSummary;

  // Upsert — one row per user, overwrite not append
  await supabase.from('memory_summary').upsert(
    {
      user_id: userId,
      summary_text: newSummary,
      version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  return newSummary;
}
