import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-remix';
import type { Database } from '~/lib/database.types';

// Create a singleton client to prevent multiple instances
let clientInstance: any = null;

export function useSupabase(supabaseUrl: string, supabaseKey: string) {
  return useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return null;
    }
    
    // Return existing instance if already created with same config
    if (clientInstance && 
        clientInstance.supabaseUrl === supabaseUrl && 
        clientInstance.supabaseKey === supabaseKey) {
      return clientInstance.client;
    }
    
    const client = createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey
    );
    
    // Store the instance
    clientInstance = {
      client,
      supabaseUrl,
      supabaseKey
    };
    
    return client;
  }, [supabaseUrl, supabaseKey]);
}