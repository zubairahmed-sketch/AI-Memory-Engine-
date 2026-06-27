-- ============================================================
-- Mindtrace: Database Schema Migration (v1)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable pg_trgm extension for fuzzy text matching (dedup)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. Profiles (seeded at onboarding)
-- ============================================
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  goals TEXT,
  focus_areas TEXT[],
  tone_preference TEXT DEFAULT 'balanced',
  onboarding_answers JSONB DEFAULT '{}'::jsonb,
  memory_extraction_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. Journal Entries (raw input — not sent to LLM after extraction)
-- ============================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_user_date ON journal_entries(user_id, created_at DESC);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries"
  ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries"
  ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. Memories (structured, queryable fact layer)
-- ============================================
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN (
    'preference', 'goal', 'relationship', 'habit', 'contextual'
  )),
  confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1) DEFAULT 0.5,
  entities JSONB DEFAULT '[]'::jsonb,
  relationships JSONB DEFAULT '[]'::jsonb,
  source_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_deprecated BOOLEAN DEFAULT FALSE,
  deprecated_by UUID REFERENCES memories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_category ON memories(user_id, category);
CREATE INDEX idx_memories_confidence ON memories(user_id, confidence DESC);
CREATE INDEX idx_memories_active ON memories(user_id) WHERE is_deprecated = FALSE;
CREATE INDEX idx_memories_trgm ON memories USING GIN (content gin_trgm_ops);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. Memory Summary (ONE current row per user — overwrite, not append)
-- ============================================
CREATE TABLE memory_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  summary_text TEXT NOT NULL,
  version INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE memory_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summary"
  ON memory_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summary"
  ON memory_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summary"
  ON memory_summary FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. Habits
-- ============================================
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  color VARCHAR(7) DEFAULT '#2D6A6A',
  icon TEXT DEFAULT '✨',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_habits_user ON habits(user_id);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. Habit Logs (streaks computed from log dates, not stored)
-- ============================================
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(habit_id, log_date)
);

CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id, log_date DESC);
CREATE INDEX idx_habit_logs_user ON habit_logs(user_id, log_date DESC);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs"
  ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs"
  ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. Chat Messages (display only — AI never reads this for context)
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_user_date ON chat_messages(user_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. Token Usage Logs (powers cost-comparison dashboard)
-- ============================================
CREATE TABLE token_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN (
    'fact_extraction', 'summary_compression', 'chat_response'
  )),
  tokens_used INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_usage_user ON token_usage_logs(user_id, created_at DESC);

ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON token_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage"
  ON token_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 10. Fuzzy match helper function (for rule-based dedup)
-- ============================================
CREATE OR REPLACE FUNCTION find_similar_memory(
  p_user_id UUID,
  p_content TEXT,
  p_category VARCHAR(50),
  p_threshold REAL DEFAULT 0.4
)
RETURNS TABLE(id UUID, content TEXT, similarity REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, similarity(m.content, p_content) AS sim
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.category = p_category
    AND m.is_deprecated = FALSE
    AND similarity(m.content, p_content) > p_threshold
  ORDER BY sim DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
