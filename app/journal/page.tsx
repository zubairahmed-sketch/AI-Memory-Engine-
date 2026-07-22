'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import type { JournalEntry, ExtractedFact, MoodOption } from '@/lib/types';
import { MOOD_OPTIONS } from '@/lib/types';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentFacts, setRecentFacts] = useState<ExtractedFact[]>([]);
  const [showFacts, setShowFacts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    const res = await fetch('/api/journal?limit=30');
    const data = await res.json();
    if (data.data) setEntries(data.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    setRecentFacts([]);

    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), mood: selectedMood }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.data) {
      setContent('');
      setSelectedMood(null);
      fetchEntries();

      if (data.data.extracted_facts?.length > 0) {
        setRecentFacts(data.data.extracted_facts);
        setShowFacts(true);
        setTimeout(() => setShowFacts(false), 10000);
      }
    }

    if (textareaRef.current) textareaRef.current.focus();
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/journal/${id}`, { method: 'DELETE' });
    fetchEntries();
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Main — Entry Composer + List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <h1 className="font-serif text-2xl font-bold">Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write freely. Facts are extracted automatically.
          </p>
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-6 border-b border-border">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-normal leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            }}
          />

          <div className="flex items-center justify-between mt-3">
            {/* Mood selector */}
            <div className="flex items-center gap-1">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={() => setSelectedMood(selectedMood === m.emoji ? null : m.emoji)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all hover:bg-muted"
                  style={{
                    background: selectedMood === m.emoji ? 'var(--accent-muted)' : 'transparent',
                    transform: selectedMood === m.emoji ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ctrl+Enter to submit</span>
              <button
                type="submit"
                disabled={!content.trim() || loading}
                className="btn btn-primary py-2 px-4 disabled:opacity-40"
              >
                {loading ? (
                  <span className="animate-pulse-soft flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Extracting...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">No entries yet. Start writing above ☝️</p>
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={entry.id}
                className="card p-4 group animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {entry.mood && <span className="text-sm">{entry.mood}</span>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive-muted hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right sidebar — Recently Extracted Facts */}
      <div className="hidden lg:block w-80 border-l border-border bg-card/50 overflow-y-auto">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="font-serif text-sm font-semibold">Recently Extracted</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Facts extracted from your latest entry.
          </p>
        </div>

        <div className="p-5">
          {showFacts && recentFacts.length > 0 ? (
            <div className="space-y-3">
              {recentFacts.map((fact, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border bg-card animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <p className="text-sm">{fact.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`badge cat-${fact.category} text-xs`}>
                      {fact.category}
                    </span>
                    <span className={`badge text-xs ${
                      fact.confidence >= 0.7 ? 'confidence-high' :
                      fact.confidence >= 0.5 ? 'confidence-medium' : 'confidence-low'
                    }`}>
                      {Math.round(fact.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Write a journal entry to see extracted facts here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
