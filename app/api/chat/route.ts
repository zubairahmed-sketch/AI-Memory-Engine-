import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai, AI_MODEL } from '@/lib/openai/client';
import { assembleContext, formatContextForPrompt } from '@/lib/memory/assembleContext';
import { logTokenUsage } from '@/lib/tokenTracking';

const SYSTEM_PROMPT = `You are a reflective journaling assistant called Mindtrace. Use this context — don't ask the user to repeat what you already know. Be warm, specific, and reference their stored facts naturally. Keep responses concise but thoughtful.`;

// POST: Send message → assembleContext → generate response (Call 3)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // 1. Save user message to chat_messages (display only)
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message.trim(),
  });

  // 2. Assemble context — pure DB query, no LLM call
  const context = await assembleContext(user.id);
  const contextStr = formatContextForPrompt(context);

  // 3. Get tone preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('tone_preference')
    .eq('user_id', user.id)
    .single();

  const toneNote = profile?.tone_preference
    ? `\nAdopt a ${profile.tone_preference} tone in your responses.`
    : '';

  // 4. Build system prompt with assembled context
  const fullSystemPrompt = `${SYSTEM_PROMPT}${toneNote}\n\n--- User Context ---\n${contextStr || 'No stored context yet — this is a new user.'}`;

  // 5. Call 3: Chat Response (gpt-4o-mini)
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: message.trim() },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logTokenUsage(user.id, 'chat_response', tokensUsed);

  const reply = completion.choices[0]?.message?.content?.trim() ?? 'I couldn\'t generate a response. Please try again.';

  // 6. Save assistant response to chat_messages
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: reply,
  });

  return NextResponse.json({
    data: {
      reply,
      context_used: context,
      tokens_used: tokensUsed,
    },
    error: null,
  });
}

// GET: Fetch chat history (display only)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, error: null });
}
