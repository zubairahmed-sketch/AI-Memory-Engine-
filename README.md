# 🧠 Mindtrace — AI Memory Engine

> A journaling + habit-tracking app where the AI remembers **structured facts** about you — confidence-scored, time-aware, deduplicated — instead of replaying raw chat history.

**~70% fewer tokens per session.** The AI feels like it remembers you because it actually does.

---

## ✨ Key Features

- **Structured Memory Extraction** — Every journal entry is analyzed to extract facts (preferences, goals, relationships, habits) with confidence scores
- **Two-Tier Memory** — Structured facts + a rolling summary (compressed every 5 entries) keeps context size flat
- **Smart Deduplication** — `pg_trgm` fuzzy matching merges near-duplicate facts; outdated ones are deprecated, not deleted
- **Context Assembly** — Pure DB query (no LLM call) builds the prompt context from profile + summary + top-8 facts + habit streaks
- **Habit Tracking** — Track daily/weekly habits with streaks, one-tap completion
- **Memory Browser** — View, edit, delete any stored fact; see the rolling summary
- **Token Cost Comparison** — Live dashboard showing real vs. simulated naive baseline token usage
- **Data Export** — Full JSON export of all your data anytime

---

## 🏗️ Architecture

```
Journal Entry
     │
     ▼
[Call 1: extractFacts — gpt-4o-mini, JSON mode]
     │  Rule-based dedup via pg_trgm
     ▼
memories table (confidence-scored, categorized facts)
     │
     ▼  every 5 entries
[Call 2: compressSummary — gpt-4o-mini]
     │  ONE row per user — overwrite not append
     ▼
memory_summary table
     │
     ▼  on chat message
assembleContext()  ← pure DB query, NO LLM call
     │  { profile + summary + top facts + habit streaks }
     ▼
[Call 3: chat response — gpt-4o-mini]
```

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + custom design system |
| Database | Supabase (Postgres + Auth + RLS) |
| AI | OpenAI `gpt-4o-mini` |
| Deployment | Vercel + Supabase Cloud |

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone <repo>
cd Mindtrace-AIMemoryEngine
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the **SQL Editor**, run the contents of `supabase/migration.sql`

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-your-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
app/
├── api/
│   ├── chat/           # Call 3: AI chat with assembled context
│   ├── habits/         # Habit CRUD + streak computation
│   ├── journal/        # Entry creation → triggers Call 1 + 2
│   ├── memory/         # Fact CRUD + rolling summary
│   ├── settings/       # Data export
│   └── usage/          # Token cost comparison stats
├── chat/               # Chat UI + context panel
├── dashboard/          # Stats overview
├── habits/             # Habit tracking
├── journal/            # Entry composer + fact sidebar
├── memory/             # Facts browser + timeline
├── settings/           # Account + memory controls + export
├── login/ signup/      # Auth pages
└── onboarding/         # 4-step profile seeding

lib/
├── memory/
│   ├── extractFacts.ts    # Call 1: JSON mode extraction + dedup
│   ├── compressSummary.ts # Call 2: Rolling summary compression
│   └── assembleContext.ts # Pure DB: builds chat system prompt
├── supabase/           # Browser + server Supabase clients
├── openai/             # OpenAI client (gpt-4o-mini)
└── types/              # Shared TypeScript types

supabase/
└── migration.sql       # Full schema + RLS + pg_trgm function
```

---

## 🔮 Future Work

- `pgvector` semantic dedup (replace `pg_trgm`)
- Knowledge graph visualization (D3)
- Voice journaling (Whisper API)
- Flutter mobile app
- Field-level encryption for sensitive categories
- Background extraction queue
