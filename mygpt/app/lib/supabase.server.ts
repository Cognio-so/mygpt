import { createServerClient } from '@supabase/auth-helpers-remix'
import type { Database } from './database.types'

export const createSupabaseServerClient = (request: Request, env: any) => {
  const response = new Response()

  if (!env || !env.SUPABASE_URL || !env.SUPABASE_API_KEY) {
    console.error("Missing Supabase environment variables!");
    throw new Error("Missing required Supabase configuration");
  }

  try {
    const supabase = createServerClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_API_KEY,
      {
        request,
        response,
      }
    )

    return { supabase, response }
  } catch (error) {
    console.error("Supabase client creation error:", error);
    throw error;
  }
} 