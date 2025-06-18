import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { useOutletContext } from '@remix-run/react';

type SupabaseClient = ReturnType<typeof createClient>;

type ContextType = { supabase: SupabaseClient };

export const useSupabase = () => {
  // Try to get Supabase from outlet context first
  try {
    return useOutletContext<ContextType>();
  } catch (error) {
    // If not available in outlet context, create it using ENV values
    // This is a fallback, but should be avoided in production
    console.warn('Supabase client not found in context, creating new instance');
    
    const supabaseUrl = typeof window !== 'undefined' ? 
      (window.ENV?.SUPABASE_URL || '') : '';
    const supabaseKey = typeof window !== 'undefined' ? 
      (window.ENV?.SUPABASE_API_KEY || '') : '';
    
    const supabase = useMemo(() => {
      return createClient(supabaseUrl, supabaseKey);
    }, [supabaseUrl, supabaseKey]);
    
    return { supabase };
  }
};