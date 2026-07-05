'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Brain, ArrowRight, ArrowLeft, Sparkles, Target, Palette, MessageCircle } from 'lucide-react';
import type { OnboardingAnswers } from '@/lib/types';

const FOCUS_OPTIONS = [
  { id: 'mindfulness', label: '🧘 Mindfulness', desc: 'Stay present and grounded' },
  { id: 'productivity', label: '⚡ Productivity', desc: 'Get more done with less stress' },
  { id: 'health', label: '💪 Health & Fitness', desc: 'Physical well-being' },
  { id: 'relationships', label: '❤️ Relationships', desc: 'Connect with people who matter' },
  { id: 'career', label: '💼 Career Growth', desc: 'Professional development' },
  { id: 'creativity', label: '🎨 Creativity', desc: 'Express yourself freely' },
  { id: 'learning', label: '📚 Learning', desc: 'Grow your knowledge' },
  { id: 'finance', label: '💰 Finance', desc: 'Build financial confidence' },
];

const TONE_OPTIONS = [
  { id: 'warm', label: 'Warm & encouraging', icon: '☀️' },
  { id: 'balanced', label: 'Balanced & neutral', icon: '⚖️' },
  { id: 'direct', label: 'Direct & concise', icon: '🎯' },
  { id: 'reflective', label: 'Reflective & thoughtful', icon: '🪞' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    what_brings_you: '',
    main_goals: '',
    focus_areas: [],
    tone_preference: 'balanced',
    anything_else: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const steps = [
    {
      title: 'What brings you to Mindtrace?',
      subtitle: 'Help us understand what you\'re looking for.',
      icon: <Sparkles className="w-6 h-6" />,
    },
    {
      title: 'What are your main goals?',
      subtitle: 'What do you hope to achieve through journaling?',
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: 'Pick your focus areas',
      subtitle: 'Select as many as you like. You can change these later.',
      icon: <Palette className="w-6 h-6" />,
    },
    {
      title: 'How should the AI talk to you?',
      subtitle: 'Choose a conversation tone that feels right.',
      icon: <MessageCircle className="w-6 h-6" />,
    },
  ];

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        goals: answers.main_goals || null,
        focus_areas: answers.focus_areas?.length ? answers.focus_areas : null,
        tone_preference: answers.tone_preference || 'balanced',
        onboarding_answers: answers,
      })
      .eq('user_id', user.id);

    router.push('/dashboard');
    router.refresh();
  }

  function toggleFocus(id: string) {
    setAnswers((prev) => {
      const areas = prev.focus_areas ?? [];
      return {
        ...prev,
        focus_areas: areas.includes(id) ? areas.filter((a) => a !== id) : [...areas, id],
      };
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Brain className="w-7 h-7 text-accent" />
            <span className="font-serif text-xl font-semibold">Mindtrace</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: i <= step ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="card p-6 animate-fade-in" key={step}>
          <div className="flex items-center gap-3 mb-1 text-accent">
            {steps[step].icon}
            <span className="text-xs font-medium uppercase tracking-wider">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold mb-1">{steps[step].title}</h2>
          <p className="text-sm text-muted-foreground mb-6">{steps[step].subtitle}</p>

          {/* Step 0: What brings you */}
          {step === 0 && (
            <textarea
              value={answers.what_brings_you}
              onChange={(e) => setAnswers({ ...answers, what_brings_you: e.target.value })}
              placeholder="I want to be more reflective about my daily life..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          )}

          {/* Step 1: Main goals */}
          {step === 1 && (
            <textarea
              value={answers.main_goals}
              onChange={(e) => setAnswers({ ...answers, main_goals: e.target.value })}
              placeholder="Build better habits, understand my patterns, track my progress..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          )}

          {/* Step 2: Focus areas */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_OPTIONS.map((opt) => {
                const selected = answers.focus_areas?.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleFocus(opt.id)}
                    className="p-3 rounded-lg border text-left transition-all text-sm"
                    style={{
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                      background: selected ? 'var(--accent-muted)' : 'transparent',
                    }}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Tone preference */}
          {step === 3 && (
            <div className="space-y-2">
              {TONE_OPTIONS.map((opt) => {
                const selected = answers.tone_preference === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers({ ...answers, tone_preference: opt.id })}
                    className="w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3"
                    style={{
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                      background: selected ? 'var(--accent-muted)' : 'transparent',
                    }}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn btn-ghost disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn btn-primary">
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse-soft">Setting up...</span>
              ) : (
                <>
                  Start journaling
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Skip */}
        <div className="text-center mt-4">
          <button
            onClick={handleFinish}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
