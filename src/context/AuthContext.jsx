import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { determineStakeholderRole } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId, currentUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }

      const activeUser = currentUser || user

      if (data) {
        const org = Array.isArray(data.organizations)
          ? data.organizations[0]
          : (data.organizations || null)

        const stakeholderRole = determineStakeholderRole(data, activeUser)

        const enriched = {
          ...data,
          organization: org,
          stakeholderRole,
        }
        setProfile(enriched)
        return enriched
      } else if (activeUser) {
        // Fallback minimal profile derived from Supabase Auth user metadata
        const fallbackRole = determineStakeholderRole(null, activeUser)
        const minimal = {
          id: activeUser.id,
          email: activeUser.email,
          name: activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || 'User',
          role: fallbackRole,
          stakeholderRole: fallbackRole,
          organizations: [],
          organization: null,
        }
        setProfile(minimal)
        return minimal
      } else {
        setProfile(null)
        return null
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setProfile(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { data: null, error, profile: null }
    }
    if (data?.user) {
      setUser(data.user)
      const loadedProfile = await fetchProfile(data.user.id, data.user)
      return { data, error: null, profile: loadedProfile }
    }
    return { data, error: null, profile: null }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
    return { error }
  }

  const value = {
    user,
    profile,
    stakeholderRole: profile?.stakeholderRole || null,
    loading,
    signIn,
    signOut,
    refetchProfile: () => user && fetchProfile(user.id, user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
