import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Token usage stats for cost comparison dashboard
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all usage logs
  const { data: logs, error } = await supabase
    .from('token_usage_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by call_type
  const byType: Record<string, number> = {};
  let totalTokens = 0;
  for (const log of logs ?? []) {
    byType[log.call_type] = (byType[log.call_type] || 0) + log.tokens_used;
    totalTokens += log.tokens_used;
  }

  // Count total journal entries and chat messages for naive baseline estimate
  const { count: entryCount } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: chatCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user');

  // Naive baseline: estimate ~800 tokens per session if using raw history
  const totalSessions = (chatCount ?? 0);
  const naiveBaseline = totalSessions * 800;
  const actualUsed = byType['chat_response'] || 0;
  const tokensSaved = Math.max(0, naiveBaseline - actualUsed);
  const savingsPercent = naiveBaseline > 0 ? Math.round((tokensSaved / naiveBaseline) * 100) : 0;

  // Daily breakdown for chart
  const dailyMap: Record<string, { structured: number; naive: number }> = {};
  for (const log of logs ?? []) {
    const day = log.created_at.split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { structured: 0, naive: 0 };
    dailyMap[day].structured += log.tokens_used;
    if (log.call_type === 'chat_response') {
      dailyMap[day].naive += 800; // simulated naive baseline per chat
    }
  }

  const dailyBreakdown = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return NextResponse.json({
    data: {
      by_type: byType,
      total_tokens: totalTokens,
      naive_baseline: naiveBaseline,
      tokens_saved: tokensSaved,
      savings_percent: savingsPercent,
      total_entries: entryCount ?? 0,
      total_chats: chatCount ?? 0,
      daily_breakdown: dailyBreakdown,
    },
    error: null,
  });
}
