'use client';

import { useEffect, useState } from 'react';
import { Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { Memory, MemoryCategory, MemorySummary } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

const CATEGORIES: MemoryCategory[] = ['preference', 'goal', 'relationship', 'habit', 'contextual'];

export default function MemoryPage() {
  const [tab, setTab] = useState<'facts' | 'timeline'>('facts');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [memRes, sumRes] = await Promise.all([
      fetch('/api/memory'),
      fetch('/api/memory/summary'),
    ]);
    const memData = await memRes.json();
    const sumData = await sumRes.json();
    if (memData.data) setMemories(memData.data);
    if (sumData.data) setSummary(sumData.data);
    setLoading(false);
  }

  async function deleteMemory(id: string) {
    await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/memory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setMemories((prev) => prev.map((m) => m.id === id ? { ...m, content: editContent } : m));
    }
    setEditingId(null);
  }

  function startEdit(m: Memory) {
    setEditingId(m.id);
    setEditContent(m.content);
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const filtered = activeCategory === 'all'
    ? memories
    : memories.filter((m) => m.category === activeCategory);

  const byCategory = CATEGORIES.reduce<Record<string, Memory[]>>((acc, cat) => {
    acc[cat] = filtered.filter((m) => m.category === cat);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold">Memory Browser</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {memories.length} facts stored · review, edit, or delete any entry
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
        {(['facts', 'timeline'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
            style={{
              background: tab === t ? 'var(--card)' : 'transparent',
              color: tab === t ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---- FACTS TAB ---- */}
      {tab === 'facts' && (
        <div className="space-y-4">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setActiveCategory('all')}
              className="badge text-xs px-3 py-1 transition-all"
              style={{
                background: activeCategory === 'all' ? 'var(--accent)' : 'var(--muted)',
                color: activeCategory === 'all' ? 'white' : 'var(--muted-foreground)',
              }}
            >
              All ({memories.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = memories.filter((m) => m.category === cat).length;
              if (count === 0) return null;
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(active ? 'all' : cat)}
                  className="badge text-xs px-3 py-1 transition-all capitalize"
                  style={{
                    background: active ? CATEGORY_COLORS[cat] : 'var(--muted)',
                    color: active ? 'white' : 'var(--muted-foreground)',
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                No memories yet. Write some journal entries to start building your memory.
              </p>
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const items = byCategory[cat];
              if (items.length === 0) return null;
              const isOpen = expandedCategories.has(cat);
              return (
                <div key={cat} className="card overflow-hidden animate-fade-in">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[cat] }}
                      />
                      <span className="font-medium text-sm capitalize">{cat}</span>
                      <span className="badge text-xs px-2 py-0.5" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        {items.length}
                      </span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {items.map((mem) => (
                        <div key={mem.id} className="px-4 py-3 flex items-start gap-3 group hover:bg-muted/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            {editingId === mem.id ? (
                              <div className="flex gap-2">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 text-sm border border-accent rounded px-2 py-1 resize-none focus:outline-none"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => saveEdit(mem.id)} className="p-1 rounded text-success hover:bg-success-muted">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm">{mem.content}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Confidence badge */}
                              <span className={`badge text-xs ${
                                mem.confidence >= 0.7 ? 'confidence-high' :
                                mem.confidence >= 0.5 ? 'confidence-medium' : 'confidence-low'
                              }`}>
                                {Math.round(mem.confidence * 100)}% confidence
                              </span>
                              {mem.is_deprecated && (
                                <span className="badge text-xs bg-muted text-muted-foreground">deprecated</span>
                              )}
                              {mem.valid_until && (
                                <span className="badge text-xs bg-warning-muted text-warning">
                                  expires {new Date(mem.valid_until).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(mem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          {/* Actions */}
                          {editingId !== mem.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(mem)}
                                className="p-1.5 rounded hover:bg-muted transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => deleteMemory(mem.id)}
                                className="p-1.5 rounded hover:bg-destructive-muted transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ---- TIMELINE TAB ---- */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {/* Rolling Summary */}
          {summary && (
            <div className="card p-5 border-l-4 animate-fade-in" style={{ borderLeftColor: 'var(--accent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Rolling Summary</span>
                <span className="badge text-xs bg-accent-muted text-accent">v{summary.version}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{summary.summary_text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Last compressed: {new Date(summary.updated_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Timeline of memories */}
          {memories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No memories yet. Write journal entries to populate the timeline.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3 ml-10">
                {[...memories].sort((a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ).map((mem, i) => (
                  <div key={mem.id} className="relative animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div
                      className="absolute -left-7 w-3 h-3 rounded-full border-2 border-card"
                      style={{ background: CATEGORY_COLORS[mem.category] ?? 'var(--muted-foreground)', top: '0.75rem' }}
                    />
                    <div className="card p-4">
                      <p className="text-sm">{mem.content}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`badge text-xs cat-${mem.category} capitalize`}>{mem.category}</span>
                        <span className={`badge text-xs ${
                          mem.confidence >= 0.7 ? 'confidence-high' :
                          mem.confidence >= 0.5 ? 'confidence-medium' : 'confidence-low'
                        }`}>
                          {Math.round(mem.confidence * 100)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(mem.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
