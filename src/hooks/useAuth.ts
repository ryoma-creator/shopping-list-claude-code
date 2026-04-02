import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import type { User, AuthError } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const prevUserId = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      prevUserId.current = u?.id ?? null
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        // Clear cache when user changes (sign out or different user signs in)
        if (prevUserId.current && prevUserId.current !== u?.id) {
          offlineCache.clear()
        }
        prevUserId.current = u?.id ?? null
        setUser(u)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /** Sign up with display name stored in user_metadata */
  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    })
    return error
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    // Clear previous user's cache before signing in
    offlineCache.clear()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    offlineCache.clear()
    await supabase.auth.signOut()
  }, [])

  /** Get display name from user metadata, fallback to email prefix */
  const displayName = user?.user_metadata?.display_name
    || user?.email?.split('@')[0]
    || 'User'

  return { user, loading, displayName, signUp, signIn, signOut }
}
