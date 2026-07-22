import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Log a habit completion for today
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  // Check if already logged
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', id)
    .eq('log_date', today)
    .single();

  if (existing) {
    // Toggle off — delete the log
    await supabase.from('habit_logs').delete().eq('id', existing.id);
    return NextResponse.json({ data: { completed: false, date: today }, error: null });
  }

  // Log completion
  const { error } = await supabase.from('habit_logs').insert({
    habit_id: id,
    user_id: user.id,
    log_date: today,
    completed: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { completed: true, date: today }, error: null });
}

// DELETE: Delete a habit
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { deleted: true }, error: null });
}
