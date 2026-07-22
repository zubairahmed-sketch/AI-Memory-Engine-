'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Check, Flame, Target, Trash2 } from 'lucide-react';
import type { HabitWithStreak } from '@/lib/types';

const ICON_OPTIONS = ['✨', '🏃', '📚', '💪', '🧘', '💧', '🎯', '🌱', '✍️', '🎨', '🎵', '🍎'];
const COLOR_OPTIONS = ['#2D6A6A', '#4C4F8E', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444'];

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newIcon, setNewIcon] = useState('✨');
  const [newColor, setNewColor] = useState('#2D6A6A');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchHabits(); }, []);

  async function fetchHabits() {
    setLoading(true);
    const res = await fetch('/api/habits');
    const data = await res.json();
    if (data.data) setHabits(data.data);
    setLoading(false);
  }

  async function toggleHabit(id: string) {
    // Optimistic update
    setHabits((prev) => prev.map((h) => h.id === id
      ? { ...h, completed_today: !h.completed_today, current_streak: !h.completed_today ? h.current_streak + 1 : Math.max(0, h.current_streak - 1) }
      : h
    ));
    await fetch(`/api/habits/${id}`, { method: 'POST' });
    fetchHabits(); // Refresh for accurate streak
  }

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), frequency: newFreq, icon: newIcon, color: newColor }),
    });
    setCreating(false);
    if (res.ok) {
      setNewName('');
      setNewFreq('daily');
      setNewIcon('✨');
      setNewColor('#2D6A6A');
      setShowNew(false);
      fetchHabits();
    }
  }

  async function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
  }

  const activeHabits = habits.filter((h) => h.is_active);
  const completedToday = activeHabits.filter((h) => h.completed_today).length;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {completedToday}/{activeHabits.length} completed today
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {/* Progress bar */}
      {activeHabits.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Today&apos;s progress</span>
            <span>{completedToday}/{activeHabits.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: activeHabits.length ? `${(completedToday / activeHabits.length) * 100}%` : '0%',
                background: completedToday === activeHabits.length && activeHabits.length > 0
                  ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* New Habit Form */}
      {showNew && (
        <div className="card p-5 animate-fade-in border-accent/30 border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-base font-semibold">New Habit</h2>
            <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={createHabit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Morning run"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Frequency</label>
                <select
                  value={newFreq}
                  onChange={(e) => setNewFreq(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-card"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-1">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className="w-8 h-8 rounded text-base transition-all hover:bg-muted"
                      style={{ background: newIcon === icon ? 'var(--accent-muted)' : 'transparent' }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className="w-6 h-6 rounded-full transition-all"
                    style={{
                      background: color,
                      outline: newColor === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowNew(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={!newName.trim() || creating} className="btn btn-primary disabled:opacity-40">
                {creating ? <span className="animate-pulse-soft">Creating...</span> : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habit List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : activeHabits.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-accent/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No habits yet.</p>
          <button onClick={() => setShowNew(true)} className="text-accent text-sm hover:underline mt-1">
            Create your first habit →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeHabits.map((habit, i) => (
            <div
              key={habit.id}
              className="card p-4 flex items-center gap-4 group animate-fade-in"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* Check button */}
              <button
                onClick={() => toggleHabit(habit.id)}
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all"
                style={{
                  borderColor: habit.completed_today ? habit.color : 'var(--border)',
                  background: habit.completed_today ? habit.color : 'transparent',
                  color: habit.completed_today ? 'white' : habit.color,
                }}
              >
                {habit.completed_today ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-lg">{habit.icon}</span>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{habit.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground capitalize">{habit.frequency}</span>
                  {habit.current_streak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: habit.color }}>
                      <Flame className="w-3 h-3" />
                      {habit.current_streak} day streak
                    </span>
                  )}
                  {habit.longest_streak > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Best: {habit.longest_streak}
                    </span>
                  )}
                </div>
              </div>

              {/* Streak rings */}
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, d) => {
                  // We show last 7 days visually — simplified dot row
                  const filled = d < habit.current_streak && d < 7;
                  return (
                    <div
                      key={d}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: filled ? habit.color : 'var(--border)',
                        opacity: filled ? (d === 0 ? 1 : 0.6 + d * 0.05) : 1,
                      }}
                    />
                  );
                })}
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteHabit(habit.id)}
                className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive-muted transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
