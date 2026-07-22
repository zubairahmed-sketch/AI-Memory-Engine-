import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Export all user data as JSON
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profile, entries, memories, summary, habits, logs, messages, usage] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('memories').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('memory_summary').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase.from('habit_logs').select('*').eq('user_id', user.id),
    supabase.from('chat_messages').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('token_usage_logs').select('*').eq('user_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profile.data,
    journal_entries: entries.data ?? [],
    memories: memories.data ?? [],
    memory_summary: summary.data,
    habits: habits.data ?? [],
    habit_logs: logs.data ?? [],
    chat_messages: messages.data ?? [],
    token_usage: usage.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mindtrace-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
