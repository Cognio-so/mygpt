import { createContext, useContext, useEffect, useState } from 'react'
import { useLoaderData, useRevalidator } from '@remix-run/react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseClient } from './supabase.client'

type AuthContextType = {
  user: User | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ 
  children, 
  serverUser 
}: { 
  children: React.ReactNode
  serverUser: User | null 
}) {
  const [user, setUser] = useState<User | null>(serverUser)
  const revalidator = useRevalidator()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        revalidator.revalidate()
      }
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase, revalidator])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 