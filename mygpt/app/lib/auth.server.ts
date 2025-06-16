import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function requireAuth(request: Request, env: any) {
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect('/login', {
      headers: response.headers,
    });
  }

  return { user: session.user, response };
}

export async function getOptionalAuth(request: Request, env: any) {
  try {
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return { user: session?.user || null, response };
  } catch (error) {
    console.error('Auth check error:', error);
    return { user: null, response: new Response() };
  }
} 