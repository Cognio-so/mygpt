import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseClient } from '~/lib/supabase.client';

interface SupabaseContextType {
  supabase: any;
  isReady: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isReady: false,
});

interface SupabaseProviderProps {
  children: ReactNode;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export function SupabaseProvider({ children, supabaseUrl, supabaseKey }: SupabaseProviderProps) {
  const [supabase, setSupabase] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && supabaseUrl && supabaseKey) {
      const client = getSupabaseClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      setIsReady(true);
    }
  }, [supabaseUrl, supabaseKey]);

  return (
    <SupabaseContext.Provider value={{ supabase, isReady }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
} 