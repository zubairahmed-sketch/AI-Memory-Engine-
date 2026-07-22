'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Brain, User, PanelRightOpen, PanelRightClose, Sparkles } from 'lucide-react';
import type { ChatMessage, AssembledContext } from '@/lib/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextUsed, setContextUsed] = useState<AssembledContext | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    const res = await fetch('/api/chat');
    const data = await res.json();
    if (data.data) setMessages(data.data);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic: show user message immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.data) {
      const assistantMsg: ChatMessage = {
        id: `resp-${Date.now()}`,
        user_id: '',
        role: 'assistant',
        content: data.data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setContextUsed(data.data.context_used);
      setTokensUsed(data.data.tokens_used);
    }

    inputRef.current?.focus();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h1 className="font-serif text-lg font-semibold">Chat</h1>
            <p className="text-xs text-muted-foreground">
              AI uses your structured memory, not raw history
            </p>
          </div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="btn btn-ghost p-2 hidden lg:flex"
            title="Toggle context panel"
          >
            {showContext ? (
              <PanelRightClose className="w-4.5 h-4.5" />
            ) : (
              <PanelRightOpen className="w-4.5 h-4.5" />
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="w-12 h-12 text-accent/30 mb-4" />
              <h2 className="font-serif text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your AI assistant uses structured facts from your journal — not raw history.
                The more you journal, the more personalized it gets.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--accent-muted)' }}
                >
                  <Brain className="w-4 h-4 text-accent" />
                </div>
              )}
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--card)',
                  color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  borderRadius: msg.role === 'user'
                    ? '20px 20px 4px 20px'
                    : '20px 20px 20px 4px',
                }}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className="text-[10px] mt-1"
                  style={{
                    color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--muted-foreground)',
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}
              >
                <Brain className="w-4 h-4 text-accent" />
              </div>
              <div className="px-4 py-3 rounded-2xl border border-border bg-card"
                style={{ borderRadius: '20px 20px 20px 4px' }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-border">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all max-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              style={{ minHeight: '42px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn btn-primary p-2.5 rounded-xl disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Context Panel (Desktop) */}
      {showContext && (
        <div className="hidden lg:block w-80 border-l border-border bg-card/50 overflow-y-auto animate-slide-in">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="font-serif text-sm font-semibold">Context Used</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              What the AI knew when generating its last response
            </p>
            {tokensUsed > 0 && (
              <p className="text-xs text-accent mt-1 font-medium">{tokensUsed} tokens used</p>
            )}
          </div>

          {contextUsed ? (
            <div className="p-4 space-y-4">
              {/* Profile */}
              {(contextUsed.profile.goals || contextUsed.profile.focus_areas?.length) && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Profile
                  </h3>
                  <div className="text-xs space-y-1">
                    {contextUsed.profile.goals && <p>Goals: {contextUsed.profile.goals}</p>}
                    {contextUsed.profile.focus_areas?.length ? (
                      <p>Focus: {contextUsed.profile.focus_areas.join(', ')}</p>
                    ) : null}
                    <p>Tone: {contextUsed.profile.tone_preference}</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              {contextUsed.summary && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Rolling Summary
                  </h3>
                  <p className="text-xs leading-relaxed bg-muted/50 p-3 rounded-lg">
                    {contextUsed.summary}
                  </p>
                </div>
              )}

              {/* Facts */}
              {contextUsed.top_facts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Top Facts ({contextUsed.top_facts.length})
                  </h3>
                  <div className="space-y-1.5">
                    {contextUsed.top_facts.map((fact, i) => (
                      <div key={i} className="text-xs p-2 rounded bg-muted/50">
                        <p>{fact.content}</p>
                        <span className={`badge mt-1 cat-${fact.category}`}>{fact.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Habits */}
              {contextUsed.habit_streaks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Habit Streaks
                  </h3>
                  <div className="space-y-1">
                    {contextUsed.habit_streaks.map((h, i) => (
                      <p key={i} className="text-xs">
                        {h.name}: {h.current_streak} day streak ({h.frequency})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs text-muted-foreground text-center py-8">
                Send a message to see the context used.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
