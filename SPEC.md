# Mindtrace — AI Memory Engine (SPEC.md v1)

**Working name:** Mindtrace  
**One-liner:** A journaling + habit-tracking app where the AI remembers structured facts about you — confidence-scored, time-aware, deduplicated — instead of replaying raw chat history.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v4 + custom design system |
| Charts | Recharts |
| Backend | Next.js API Route Handlers only |
| Database + Auth | Supabase (Postgres + Auth + RLS) |
| AI | OpenAI gpt-4o-mini (extraction, summarization, chat) |
| Deployment | Vercel + Supabase Cloud |

---

## Three-Call Architecture

```
Journal Entry
     │
     ▼
[Call 1: extractFacts — gpt-4o-mini, JSON mode]
     │
     ▼
Rule-based dedup (pg_trgm fuzzy match, same category)
     │ no match → INSERT new memory
     │ match    → UPDATE confidence / deprecate old row
     │
     ▼ (every 5 entries)
[Call 2: compressSummary — gpt-4o-mini]
     │ ONE summary row per user, overwrite not append
     ▼
memory_summary table
     │
     ▼ (on each chat message)
assembleContext() — pure DB query, NO LLM call
     │ { profile + summary + top-8 facts + habit streaks }
     ▼
[Call 3: chat response — gpt-4o-mini]
```

---

## Database Tables (8 total, all with RLS)

- **profiles** — onboarding answers, extraction toggle, tone preference
- **journal_entries** — raw input (not re-sent to LLM after extraction)
- **memories** — structured facts with confidence, valid_from/until, is_deprecated chain
- **memory_summary** — ONE row per user (rolling summary, overwrite not append)
- **habits** — habit definitions
- **habit_logs** — completion log (streaks computed from dates, not stored)
- **chat_messages** — display only (AI never reads for context)
- **token_usage_logs** — powers cost comparison dashboard

See `supabase/migration.sql` for full schema + RLS + fuzzy match function.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Email/password + Google OAuth |
| `/signup` | Registration |
| `/onboarding` | 4-step profile seeding |
| `/dashboard` | Stats, today's habits, recent entries, token savings |
| `/journal` | Entry composer + mood + extracted facts panel |
| `/chat` | AI chat + collapsible Context Panel |
| `/memory` | Facts tab (accordion + inline edit) + Timeline tab |
| `/habits` | Habit cards, streak rings, one-tap toggle |
| `/settings` | Extraction toggle, export JSON, delete account |

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST/GET | `/api/journal` | Create entry (triggers Call 1+2) / list |
| DELETE | `/api/journal/[id]` | Delete entry |
| GET | `/api/memory` | List facts (filterable by category) |
| PATCH/DELETE | `/api/memory/[id]` | Edit or delete a fact |
| GET | `/api/memory/summary` | Get rolling summary |
| POST/GET | `/api/chat` | Send message (Call 3) / get history |
| GET/POST | `/api/habits` | List (with streaks) / create |
| POST/DELETE | `/api/habits/[id]` | Toggle today / delete habit |
| GET | `/api/usage` | Token usage + cost comparison stats |
| GET | `/api/settings/export` | Full JSON data export |

---

## Design System

- **Background:** `#FAF8F5` (warm neutral)
- **Accent:** `#2D6A6A` (deep teal)
- **Text:** `#262626` (charcoal)
- **Headings:** Source Serif 4 (serif)
- **Body/UI:** Inter (sans)
- **Tone:** calm and private, not "AI product" flashy

---

## Setup

1. Create Supabase project at supabase.com
2. Run `supabase/migration.sql` in Supabase SQL editor
3. Copy `.env.local.example` → `.env.local`, fill in keys
4. `npm install && npm run dev`

---

## Future Work (deliberately not v1)

- Semantic dedup via pgvector + text-embedding-3-small
- Knowledge graph view (D3 / vis.js)
- Voice journaling (Web Speech API / Whisper)
- Flutter mobile app
- Field-level encryption for health/finance categories
- Durable extraction queue + background worker
- Redis caching layer
