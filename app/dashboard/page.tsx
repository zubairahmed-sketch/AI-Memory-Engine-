'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Target, Brain, TrendingDown, BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { HabitWithStreak, JournalEntry } from '@/lib/types';

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [usage, setUsage] = useState<{ savings_percent: number; total_tokens: number; naive_baseline: number; total_entries: number; total_chats: number } | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch habits
    const habitsRes = await fetch('/api/habits');
    const habitsData = await habitsRes.json();
    if (habitsData.data) setHabits(habitsData.data);

    // Fetch recent entries
    const entriesRes = await fetch('/api/journal?limit=5');
    const entriesData = await entriesRes.json();
    if (entriesData.data) setRecentEntries(entriesData.data);

    // Fetch usage
    const usageRes = await fetch('/api/usage');
    const usageData = await usageRes.json();
    if (usageData.data) setUsage(usageData.data);

    // Count memories
    const { count } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_deprecated', false);
    setMemoryCount(count ?? 0);
  }

  async function toggleHabit(habitId: string) {
    await fetch(`/api/habits/${habitId}`, { method: 'POST' });
    fetchData();
  }

  const todayHabits = habits.filter((h) => h.is_active);
  const completedToday = todayHabits.filter((h) => h.completed_today).length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="font-serif text-3xl font-bold">{greeting} ✨</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s a snapshot of your Mindtrace journey.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <StatCard
          icon={<Brain className="w-4.5 h-4.5" />}
          label="Memories"
          value={memoryCount.toString()}
          color="accent"
        />
        <StatCard
          icon={<BookOpen className="w-4.5 h-4.5" />}
          label="Journal Entries"
          value={(usage?.total_entries ?? 0).toString()}
          color="indigo"
        />
        <StatCard
          icon={<Target className="w-4.5 h-4.5" />}
          label="Today&apos;s Habits"
          value={`${completedToday}/${todayHabits.length}`}
          color="success"
        />
        <StatCard
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          label="Token Savings"
          value={`${usage?.savings_percent ?? 0}%`}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Habits */}
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold">Today&apos;s Habits</h2>
            <Link href="/habits" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {todayHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No habits yet.{' '}
              <Link href="/habits" className="text-accent hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {todayHabits.slice(0, 5).map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 transition-all text-left"
                  style={{
                    background: habit.completed_today ? 'var(--success-muted)' : 'transparent',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all"
                    style={{
                      borderColor: habit.completed_today ? 'var(--success)' : 'var(--border)',
                      background: habit.completed_today ? 'var(--success)' : 'transparent',
                      color: habit.completed_today ? 'white' : 'var(--muted-foreground)',
                    }}
                  >
                    {habit.completed_today ? '✓' : habit.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{habit.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {habit.current_streak > 0 ? `🔥 ${habit.current_streak} day streak` : habit.frequency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Journal Entries */}
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold">Recent Entries</h2>
            <Link href="/journal" className="text-xs text-accent hover:underline">
              Write new →
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No entries yet.{' '}
              <Link href="/journal" className="text-accent hover:underline">
                Start journaling
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm line-clamp-2">{entry.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {entry.mood && <span className="text-sm">{entry.mood}</span>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token Cost Comparison */}
      {usage && usage.total_tokens > 0 && (
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4.5 h-4.5 text-accent" />
            <h2 className="font-serif text-lg font-semibold">Token Cost Comparison</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-accent">{usage.total_tokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Tokens used (structured)</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{usage.naive_baseline.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Naive baseline (raw history)</p>
            </div>
            <div className="p-4 rounded-lg bg-success-muted text-center">
              <p className="text-2xl font-bold text-success">{usage.savings_percent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Token savings</p>
            </div>
          </div>
          {/* Simple bar comparison */}
          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Structured memory</span>
                <span className="font-medium">{usage.total_tokens.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(5, (usage.total_tokens / Math.max(usage.naive_baseline, 1)) * 100)}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Naive raw history</span>
                <span className="font-medium">{usage.naive_baseline.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: '100%', background: 'var(--muted-foreground)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `var(--${color}-muted)`, color: `var(--${color})` }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
