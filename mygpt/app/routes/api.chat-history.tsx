import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return json({ error: 'Session ID required' }, { status: 400 });
  }

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    return json({ messages });
  } catch (error) {
    console.error('Chat history API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
} 