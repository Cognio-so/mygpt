import { createBrowserClient } from '@supabase/auth-helpers-remix'
import type { Database } from './database.types'

export const createSupabaseClient = (supabaseUrl: string, supabaseKey: string) =>
  createBrowserClient<Database>(supabaseUrl, supabaseKey) 