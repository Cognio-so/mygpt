import { createBrowserClient } from '@supabase/auth-helpers-remix'
import type { Database } from './database.types'

let supabaseClientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const getSupabaseClient = (supabaseUrl?: string, supabaseKey?: string) => {
  // Use global window vars or provided params
  const url = supabaseUrl || (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_URL : '');
  const key = supabaseKey || (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_API_KEY : '');

  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    return null;
  }

  // Return existing instance to prevent multiple clients
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  supabaseClientInstance = createBrowserClient<Database>(url, key);
  return supabaseClientInstance;
};

// For backward compatibility
export const createSupabaseClient = getSupabaseClient; 