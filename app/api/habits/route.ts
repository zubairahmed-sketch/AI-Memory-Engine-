import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: List habits
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute streaks from habit_logs
  const habitsWithStreaks = await Promise.all(
    (habits ?? []).map(async (habit) => {
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('log_date, completed')
        .eq('habit_id', habit.id)
        .eq('completed', true)
        .order('log_date', { ascending: false })
        .limit(365);

      let currentStreak = 0;
      let longestStreak = 0;
      let completedToday = false;

      if (logs && logs.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        completedToday = logs.some((l) => l.log_date === todayStr);

        // Compute current streak
        let checkDate = new Date(today);
        if (!completedToday) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        for (const log of logs) {
          const checkStr = checkDate.toISOString().split('T')[0];
          if (log.log_date === checkStr) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (log.log_date < checkStr) {
            break;
          }
        }

        // Compute longest streak
        let streak = 0;
        let prevDate: Date | null = null;
        const sortedLogs = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
        for (const log of sortedLogs) {
          const d = new Date(log.log_date);
          if (prevDate) {
            const diff = (d.getTime() - prevDate.getTime()) / 86400000;
            streak = diff === 1 ? streak + 1 : 1;
          } else {
            streak = 1;
          }
          longestStreak = Math.max(longestStreak, streak);
          prevDate = d;
        }
      }

      return {
        ...habit,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        completed_today: completedToday,
        total_completions: logs?.length ?? 0,
      };
    })
  );

  return NextResponse.json({ data: habitsWithStreaks, error: null });
}

// POST: Create a new habit
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, frequency, color, icon } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: name.trim(),
      frequency: frequency || 'daily',
      color: color || '#2D6A6A',
      icon: icon || '✨',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, error: null });
}
