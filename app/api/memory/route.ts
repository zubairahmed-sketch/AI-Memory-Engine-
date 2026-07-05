import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: List memories (filterable by category)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const showDeprecated = searchParams.get('deprecated') === 'true';

  let query = supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (!showDeprecated) query = query.eq('is_deprecated', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, error: null });
}
