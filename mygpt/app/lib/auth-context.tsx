import { createContext, useContext, useEffect, useState } from 'react'
import { useOutletContext } from '@remix-run/react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase.client'

type AuthContextType = {
  user: User | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: serverUser } = useOutletContext<{ user: User | null }>()
  const [user, setUser] = useState<User | null>(serverUser)
  
  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    // Sync client state with server state
    setUser(serverUser)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        window.location.href = '/login'
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        window.location.href = '/dashboard'
      }
    })

    return () => subscription.unsubscribe()
  }, [serverUser])

  const signOut = async () => {
    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
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