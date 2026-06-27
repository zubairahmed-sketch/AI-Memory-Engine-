// ============================================
// Mindtrace — Core TypeScript Types (v1 Spec)
// ============================================

// --- Database Row Types ---

export type MemoryCategory =
  | 'preference'
  | 'goal'
  | 'relationship'
  | 'habit'
  | 'contextual';

export interface Profile {
  user_id: string;
  display_name: string | null;
  goals: string | null;
  focus_areas: string[] | null;
  tone_preference: string;
  onboarding_answers: OnboardingAnswers;
  memory_extraction_enabled: boolean;
  created_at: string;
}

export interface OnboardingAnswers {
  what_brings_you?: string;
  main_goals?: string;
  focus_areas?: string[];
  tone_preference?: string;
  anything_else?: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  mood: string | null;
  created_at: string;
}

export interface MemoryEntity {
  type: 'PERSON' | 'ORG' | 'LOCATION' | 'DATE' | 'PRODUCT' | 'EVENT' | 'OTHER';
  value: string;
}

export interface MemoryRelationship {
  subject: string;
  predicate: string;
  object: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category: MemoryCategory;
  confidence: number;
  entities: MemoryEntity[];
  relationships: MemoryRelationship[];
  source_entry_id: string | null;
  valid_from: string;
  valid_until: string | null;
  is_deprecated: boolean;
  deprecated_by: string | null;
  created_at: string;
}

export interface MemorySummary {
  id: string;
  user_id: string;
  summary_text: string;
  version: number;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  color: string;
  icon: string;
  created_at: string;
  is_active: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
}

export interface HabitWithStreak extends Habit {
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
  total_completions: number;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TokenUsageLog {
  id: string;
  user_id: string;
  call_type: 'fact_extraction' | 'summary_compression' | 'chat_response';
  tokens_used: number;
  created_at: string;
}

// --- Extraction Types (LLM output) ---

export interface ExtractedFact {
  content: string;
  category: MemoryCategory;
  confidence: number;
  entities?: MemoryEntity[];
  relationships?: MemoryRelationship[];
  valid_from?: string;
  valid_until?: string;
}

export interface ExtractionResponse {
  facts: ExtractedFact[];
}

// --- Context Assembly Types ---

export interface AssembledContext {
  profile: Pick<Profile, 'goals' | 'focus_areas' | 'tone_preference'>;
  summary: string | null;
  top_facts: Pick<Memory, 'content' | 'category' | 'confidence'>[];
  habit_streaks: Pick<HabitWithStreak, 'name' | 'current_streak' | 'frequency'>[];
}

// --- API Types ---

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export type MoodOption = '😊' | '😌' | '😐' | '😔' | '😤' | '🥱' | '🤔' | '💪';

export const MOOD_OPTIONS: { emoji: MoodOption; label: string }[] = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🥱', label: 'Tired' },
  { emoji: '🤔', label: 'Reflective' },
  { emoji: '💪', label: 'Motivated' },
];

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  preference: '#2D6A6A',
  goal: '#4C4F8E',
  relationship: '#8B5CF6',
  habit: '#10B981',
  contextual: '#F59E0B',
};
