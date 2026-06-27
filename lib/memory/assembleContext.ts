import { createClient } from '@/lib/supabase/server';
import type { AssembledContext } from '@/lib/types';

/**
 * assembleContext — pure DB query, NO LLM call.
 * Builds the context object injected into the chat system prompt:
 *   { profile, current_summary, top 5-8 facts, habit streaks }
 */
export async function assembleContext(userId: string): Promise<AssembledContext> {
  const supabase = await createClient();

  // 1. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('goals, focus_areas, tone_preference')
    .eq('user_id', userId)
    .single();

  // 2. Current summary
  const { data: summaryRow } = await supabase
    .from('memory_summary')
    .select('summary_text')
    .eq('user_id', userId)
    .single();

  // 3. Top facts (confidence >= 0.5, non-deprecated, ordered by recency)
  const { data: facts } = await supabase
    .from('memories')
    .select('content, category, confidence')
    .eq('user_id', userId)
    .eq('is_deprecated', false)
    .gte('confidence', 0.5)
    .order('created_at', { ascending: false })
    .limit(8);

  // 4. Habit streaks — computed from habit_logs
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, frequency')
    .eq('user_id', userId)
    .eq('is_active', true);

  const habitStreaks = [];
  if (habits) {
    for (const habit of habits) {
      const { count } = await supabase
        .from('habit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habit.id)
        .eq('completed', true);

      // Simple streak: count consecutive days ending today
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('log_date')
        .eq('habit_id', habit.id)
        .eq('completed', true)
        .order('log_date', { ascending: false })
        .limit(90);

      let streak = 0;
      if (logs && logs.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);

        for (const log of logs) {
          const logDate = new Date(log.log_date);
          logDate.setHours(0, 0, 0, 0);

          if (logDate.getTime() === checkDate.getTime()) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (logDate.getTime() === checkDate.getTime() - 86400000) {
            // Allow yesterday as start if today not yet logged
            streak++;
            checkDate = new Date(logDate);
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      habitStreaks.push({
        name: habit.name,
        current_streak: streak,
        frequency: habit.frequency as 'daily' | 'weekly' | 'monthly',
      });
    }
  }

  return {
    profile: {
      goals: profile?.goals ?? null,
      focus_areas: profile?.focus_areas ?? null,
      tone_preference: profile?.tone_preference ?? 'balanced',
    },
    summary: summaryRow?.summary_text ?? null,
    top_facts: facts ?? [],
    habit_streaks: habitStreaks,
  };
}

/**
 * Format assembled context into a string for the system prompt.
 */
export function formatContextForPrompt(ctx: AssembledContext): string {
  const parts: string[] = [];

  // Profile
  if (ctx.profile.goals || ctx.profile.focus_areas?.length) {
    parts.push(
      `Profile: Goals: ${ctx.profile.goals || 'not set'}. Focus areas: ${
        ctx.profile.focus_areas?.join(', ') || 'not set'
      }. Tone: ${ctx.profile.tone_preference}.`
    );
  }

  // Summary
  if (ctx.summary) {
    parts.push(`Summary of what I know about this user:\n${ctx.summary}`);
  }

  // Top facts
  if (ctx.top_facts.length > 0) {
    const factsStr = ctx.top_facts
      .map((f) => `- ${f.content} [${f.category}, confidence: ${f.confidence}]`)
      .join('\n');
    parts.push(`Recent facts:\n${factsStr}`);
  }

  // Habits
  if (ctx.habit_streaks.length > 0) {
    const habitsStr = ctx.habit_streaks
      .map((h) => `- ${h.name}: ${h.current_streak}-day streak (${h.frequency})`)
      .join('\n');
    parts.push(`Habit streaks:\n${habitsStr}`);
  }

  return parts.join('\n\n');
}
