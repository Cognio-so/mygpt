import { createBrowserClient } from '@supabase/auth-helpers-remix'
import type { Database } from './database.types'

let supabaseClient: any = null;

export function getSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  if (typeof window === 'undefined') {
    // Return a dummy client for server-side rendering
    return {
      auth: {
        signInWithOAuth: () => Promise.resolve({ error: null }),
      },
    };
  }

  // Return existing client if it exists
  if (supabaseClient) {
    return supabaseClient;
  }

  // Create new client only if none exists
  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  
  return supabaseClient;
}

// Reset function for cleanup (optional)
export function resetSupabaseClient() {
  supabaseClient = null;
} 