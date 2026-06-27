import { openai, AI_MODEL } from '@/lib/openai/client';
import { createClient } from '@/lib/supabase/server';
import { logTokenUsage } from '@/lib/tokenTracking';
import type { ExtractedFact, ExtractionResponse } from '@/lib/types';

const EXTRACTION_PROMPT = `Extract structured facts from this journal entry. For each fact return:
- content: a clear, concise statement of the fact
- category: one of "preference", "goal", "relationship", "habit", "contextual"
- confidence: 0.0-1.0 (how explicitly stated vs implied)
- entities (optional): array of {type, value} where type is PERSON/ORG/LOCATION/DATE/PRODUCT/EVENT/OTHER
- relationships (optional): array of {subject, predicate, object} triples

Return JSON only: { "facts": [...] }
Only extract what's explicitly stated or strongly implied. If no facts, return { "facts": [] }.`;

export async function extractFacts(
  userId: string,
  entryContent: string,
  sourceEntryId: string
): Promise<ExtractedFact[]> {
  const supabase = await createClient();

  // Call 1: Fact Extraction (gpt-4o-mini, JSON mode)
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: entryContent },
    ],
    temperature: 0.3,
  });

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logTokenUsage(userId, 'fact_extraction', tokensUsed);

  const responseText = completion.choices[0]?.message?.content ?? '{"facts":[]}';
  let parsed: ExtractionResponse;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    console.error('Failed to parse extraction response:', responseText);
    return [];
  }

  if (!parsed.facts || !Array.isArray(parsed.facts)) return [];

  // Process each extracted fact: dedup check + insert/update
  const storedFacts: ExtractedFact[] = [];

  for (const fact of parsed.facts) {
    if (!fact.content || !fact.category || fact.confidence < 0.3) continue;

    // Rule-based dedup: check for existing similar memory (same category + fuzzy text match)
    const { data: similar } = await supabase.rpc('find_similar_memory', {
      p_user_id: userId,
      p_content: fact.content,
      p_category: fact.category,
      p_threshold: 0.4,
    });

    if (similar && similar.length > 0) {
      // Match found — update existing memory (refresh confidence + timestamp)
      const existingId = similar[0].id;
      const existingSimilarity = similar[0].similarity;

      if (existingSimilarity > 0.8) {
        // Very similar — just bump confidence and timestamp
        await supabase
          .from('memories')
          .update({
            confidence: Math.min(1.0, fact.confidence + 0.1),
            created_at: new Date().toISOString(),
          })
          .eq('id', existingId);
      } else {
        // Somewhat similar — deprecate old, insert new (fact may have evolved)
        const { data: newMemory } = await supabase
          .from('memories')
          .insert({
            user_id: userId,
            content: fact.content,
            category: fact.category,
            confidence: fact.confidence,
            entities: fact.entities ?? [],
            relationships: fact.relationships ?? [],
            source_entry_id: sourceEntryId,
            valid_from: fact.valid_from ?? new Date().toISOString(),
            valid_until: fact.valid_until ?? null,
          })
          .select('id')
          .single();

        if (newMemory) {
          await supabase
            .from('memories')
            .update({
              is_deprecated: true,
              deprecated_by: newMemory.id,
            })
            .eq('id', existingId);
        }
      }
    } else {
      // No match — insert as new memory
      await supabase.from('memories').insert({
        user_id: userId,
        content: fact.content,
        category: fact.category,
        confidence: fact.confidence,
        entities: fact.entities ?? [],
        relationships: fact.relationships ?? [],
        source_entry_id: sourceEntryId,
        valid_from: fact.valid_from ?? new Date().toISOString(),
        valid_until: fact.valid_until ?? null,
      });
    }

    storedFacts.push(fact);
  }

  return storedFacts;
}
