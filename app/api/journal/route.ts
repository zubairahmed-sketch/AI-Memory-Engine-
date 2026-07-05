import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractFacts } from '@/lib/memory/extractFacts';
import { shouldCompress, compressSummary } from '@/lib/memory/compressSummary';

// POST: Create journal entry → triggers extraction
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, mood } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  // 1. Insert journal entry
  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({ user_id: user.id, content: content.trim(), mood: mood || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. Check if memory extraction is enabled
  const { data: profile } = await supabase
    .from('profiles')
    .select('memory_extraction_enabled')
    .eq('user_id', user.id)
    .single();

  let extractedFacts: Awaited<ReturnType<typeof extractFacts>> = [];

  if (profile?.memory_extraction_enabled !== false) {
    // 3. Extract facts (Call 1) — fire-and-forget with error handling
    try {
      extractedFacts = await extractFacts(user.id, content.trim(), entry.id);
    } catch (err) {
      console.error('Fact extraction failed:', err);
    }

    // 4. Check if summary compression is needed (every N entries)
    try {
      if (await shouldCompress(user.id)) {
        await compressSummary(user.id);
      }
    } catch (err) {
      console.error('Summary compression failed:', err);
    }
  }

  return NextResponse.json({
    data: { entry, extracted_facts: extractedFacts },
    error: null,
  });
}

// GET: List journal entries
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: entries, error: null });
}
