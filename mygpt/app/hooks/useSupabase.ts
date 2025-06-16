import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-remix';
import type { Database } from '~/lib/database.types';

export function useSupabase(supabaseUrl: string, supabaseKey: string) {
  return useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return null;
    }
    
    return createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey
    );
  }, [supabaseUrl, supabaseKey]);
} 