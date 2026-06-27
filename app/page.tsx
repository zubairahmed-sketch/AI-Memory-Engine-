import Link from 'next/link';
import { Brain, BookOpen, Target, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-7 h-7 text-accent" />
          <span className="font-serif text-xl font-semibold">Mindtrace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="btn btn-ghost text-sm"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary text-sm"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 badge cat-preference mb-6 text-sm px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered structured memory
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight mb-6">
            Your AI remembers{' '}
            <span className="text-accent">what matters</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Journal naturally. Mindtrace extracts structured facts — confidence-scored,
            time-aware, deduplicated — so every conversation feels continuous, not
            forgetful.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn btn-primary text-base px-8 py-3"
            >
              Start Journaling
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="btn btn-ghost text-base px-6 py-3 border border-border"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard
              icon={<Brain className="w-5 h-5" />}
              title="Structured Memory"
              description="Facts extracted with confidence scores, not raw text dumps. ~70% fewer tokens per session."
              color="accent"
            />
            <FeatureCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Smart Journal"
              description="Write freely. Mindtrace identifies preferences, goals, relationships, and habits automatically."
              color="indigo"
            />
            <FeatureCard
              icon={<Target className="w-5 h-5" />}
              title="Habit Tracking"
              description="Track daily habits with streaks. The AI notices patterns and offers gentle suggestions."
              color="success"
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="You're in Control"
              description="Review, edit, or delete any memory. Toggle extraction off for private entries."
              color="warning"
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/50 border-t border-border py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Step
                number="1"
                title="Journal"
                description="Write your thoughts, tag your mood. Just like talking to a friend."
              />
              <Step
                number="2"
                title="Extract"
                description="AI extracts structured facts with confidence scores. Duplicates merge automatically."
              />
              <Step
                number="3"
                title="Remember"
                description="Every future conversation uses your assembled context — compact, relevant, personal."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        <p>Mindtrace — Your personal AI memory engine</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="card p-5 animate-fade-in">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-${color}-muted text-${color}`}
        style={{
          background: `var(--${color}-muted)`,
          color: `var(--${color})`,
        }}
      >
        {icon}
      </div>
      <h3 className="font-serif font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-serif font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
