import { createClient } from '@/lib/supabase/server';

export async function logTokenUsage(
  userId: string,
  callType: 'fact_extraction' | 'summary_compression' | 'chat_response',
  tokensUsed: number
) {
  const supabase = await createClient();
  await supabase.from('token_usage_logs').insert({
    user_id: userId,
    call_type: callType,
    tokens_used: tokensUsed,
  });
}
