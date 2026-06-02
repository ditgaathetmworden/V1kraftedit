'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
import { getSupabase, dbGetUserProfile, dbUpsertUserProfile } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface SupabaseUser {
  uid: string
  email: string
  displayName: string
}

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  isInitialized: boolean
  refreshUserProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateProfile: (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isInitialized: false,
  refreshUserProfile: async () => {},
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  const supabase = getSupabase()

  // Bootstrap functions for LocalStorage Fallback (Only used if Supabase is offline/missing)
  const getLocalProfilesList = (): UserProfile[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem('kraftedit_user_profiles')
    if (stored) {
      try {
        return JSON.parse(stored) as UserProfile[]
      } catch (e) {
        return []
      }
    }
    return []
  }

  const setLocalProfilesList = (list: UserProfile[]) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('kraftedit_user_profiles', JSON.stringify(list))
  }

  const bootstrapDefaultLocalUser = () => {
    let profilesList = getLocalProfilesList()
    if (profilesList.length === 0) {
      // Bootstrap default designer profile
      const defaultProfile: UserProfile = {
        id: 'user-1',
        username: 'AETHER_BLADE',
        displayName: 'Aether Blade',
        bio: 'Professional skin architect & digital obsidian artist. Pushing the boundaries of block-based aesthetics since 2014.',
        avatarUrl: '/avatars/aether.jpg',
        skinsCreated: 12,
        totalDownloads: 4500,
        followers: 120,
        following: 5,
        publicProfile: true,
        createdAt: new Date(),
      }
      profilesList = [defaultProfile]
      setLocalProfilesList(profilesList)
    }

    const defaultProfile = profilesList[0]
    const defaultUser: SupabaseUser = {
      uid: defaultProfile.id,
      email: `${defaultProfile.username.toLowerCase()}@kraftedit.com`,
      displayName: defaultProfile.displayName || defaultProfile.username,
    }
    setUser(defaultUser)
    setUserProfile(defaultProfile)
    localStorage.setItem('kraftedit_current_user', JSON.stringify(defaultUser))
  }

  // Effect to synchronize authentication state
  useEffect(() => {
    if (typeof window === 'undefined') return

    // If Supabase is NOT configured, run in LocalStorage offline mode
    if (!supabase) {
      const storedUser = localStorage.getItem('kraftedit_current_user')
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser) as SupabaseUser
          setUser(u)
          const profile = getLocalProfilesList().find((p) => p.id === u.uid)
          if (profile) {
            setUserProfile(profile)
          } else {
            bootstrapDefaultLocalUser()
          }
        } catch (e) {
          bootstrapDefaultLocalUser()
        }
      } else {
        bootstrapDefaultLocalUser()
      }
      setLoading(false)
      setIsInitialized(true)
      return
    }

    // Active Supabase Integration
    const initSupaAuth = async () => {
      try {
        // Fetch current active Supabase Auth Session
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const sUser = session.user
          const mappedUser: SupabaseUser = {
            uid: sUser.id,
            email: sUser.email || '',
            displayName: sUser.user_metadata?.displayName || sUser.user_metadata?.username || sUser.email?.split('@')[0] || 'Explorer',
          }
          setUser(mappedUser)

          // Fetch associated user profile
          let profile = await dbGetUserProfile(sUser.id)
          if (!profile) {
            // Lazy bootstrap database profile
            profile = {
              id: sUser.id,
              username: sUser.user_metadata?.username || sUser.email?.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'EXPLORER',
              displayName: sUser.user_metadata?.displayName || sUser.email?.split('@')[0] || 'Explorer',
              bio: 'Pixel adventurer & Kraftedit creator.',
              avatarUrl: '',
              skinsCreated: 0,
              totalDownloads: 0,
              followers: 0,
              following: 0,
              publicProfile: true,
              createdAt: new Date(),
            }
            await dbUpsertUserProfile(profile)
          }
          setUserProfile(profile)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Supabase session load error:', err)
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    initSupaAuth()

    // Listen for auth state transitions in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const sUser = session.user
        const mappedUser: SupabaseUser = {
          uid: sUser.id,
          email: sUser.email || '',
          displayName: sUser.user_metadata?.displayName || sUser.user_metadata?.username || sUser.email?.split('@')[0] || 'Explorer',
        }
        setUser(mappedUser)
        
        let profile = await dbGetUserProfile(sUser.id)
        if (!profile) {
          profile = {
            id: sUser.id,
            username: sUser.user_metadata?.username || sUser.email?.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'EXPLORER',
            displayName: sUser.user_metadata?.displayName || sUser.email?.split('@')[0] || 'Explorer',
            bio: 'Pixel adventurer & Kraftedit creator.',
            avatarUrl: '',
            skinsCreated: 0,
            totalDownloads: 0,
            followers: 0,
            following: 0,
            publicProfile: true,
            createdAt: new Date(),
          }
          await dbUpsertUserProfile(profile)
        }
        setUserProfile(profile)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshUserProfile = async () => {
    if (!user) return
    const profile = await dbGetUserProfile(user.uid)
    if (profile) {
      setUserProfile(profile)
    }
  }

  // Login
  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      if (!supabase) {
        // Fallback Local Storage Login
        const profiles = getLocalProfilesList()
        const formattedUsername = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '')
        let profile = profiles.find(p => p.username === formattedUsername || p.id === 'user-1')
        if (!profile) {
          profile = profiles[0]
        }

        const activeUser: SupabaseUser = {
          uid: profile.id,
          email: email,
          displayName: profile.displayName || profile.username,
        }

        setUser(activeUser)
        setUserProfile(profile)
        localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        const activeUser: SupabaseUser = {
          uid: data.user.id,
          email: data.user.email || '',
          displayName: data.user.user_metadata?.displayName || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User',
        }
        setUser(activeUser)
        const profile = await dbGetUserProfile(data.user.id)
        if (profile) {
          setUserProfile(profile)
        }
      }
    } catch (e: any) {
      console.error(e)
      throw new Error(e.message || 'Supabase inloggen is mislukt')
    } finally {
      setLoading(false)
    }
  }

  // Google Login
  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        // Fallback
        const profiles = getLocalProfilesList()
        const profile = profiles[0]
        const activeUser: SupabaseUser = {
          uid: profile.id,
          email: 'google.explorer@kraftedit.com',
          displayName: profile.displayName || profile.username,
        }
        setUser(activeUser)
        setUserProfile(profile)
        localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      })

      if (error) throw error
    } catch (e: any) {
      console.error(e)
      throw new Error(e.message || 'Google Auth is mislukt')
    } finally {
      setLoading(false)
    }
  }

  // Registration
  const register = async (username: string, email: string, password: string) => {
    setLoading(true)
    try {
      const formattedUsername = username.toUpperCase().trim()

      if (!supabase) {
        // Fallback Registration
        const profiles = getLocalProfilesList()
        const exists = profiles.some(p => p.username.toUpperCase() === formattedUsername)
        if (exists) {
          throw new Error('Username is already taken')
        }

        const newId = `user-${Date.now()}`
        const newProfile: UserProfile = {
          id: newId,
          username: formattedUsername,
          displayName: username.trim(),
          bio: 'Pixel adventurer & Kraftedit creator.',
          avatarUrl: '',
          skinsCreated: 0,
          totalDownloads: 0,
          followers: 0,
          following: 0,
          publicProfile: true,
          createdAt: new Date(),
        }

        const updatedList = [...profiles, newProfile]
        setLocalProfilesList(updatedList)

        const activeUser: SupabaseUser = {
          uid: newId,
          email: email,
          displayName: username.trim(),
        }

        setUser(activeUser)
        setUserProfile(newProfile)
        localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
        return
      }

      // Check username exists in `profiles` (Supabase query)
      const { data: existingUser, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formattedUsername)
        .maybeSingle()
      
      if (checkErr) console.warn('Username availability check warning:', checkErr)
      if (existingUser) {
        throw new Error('Gebruikersnaam is al bezet')
      }

      // Register the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: formattedUsername,
            displayName: username.trim(),
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          username: formattedUsername,
          displayName: username.trim(),
          bio: 'Pixel adventurer & Kraftedit creator.',
          avatarUrl: '',
          skinsCreated: 0,
          totalDownloads: 0,
          followers: 0,
          following: 0,
          publicProfile: true,
          createdAt: new Date(),
        }

        await dbUpsertUserProfile(newProfile)

        const activeUser: SupabaseUser = {
          uid: data.user.id,
          email: email,
          displayName: username.trim(),
        }
        setUser(activeUser)
        setUserProfile(newProfile)
      }
    } catch (e: any) {
      console.error(e)
      throw new Error(e.message || 'Registratie is mislukt')
    } finally {
      setLoading(false)
    }
  }

  // Password Reset
  const resetPassword = async (email: string) => {
    setLoading(true)
    try {
      if (!supabase) {
        await new Promise(resolve => setTimeout(resolve, 800))
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/login`,
      })

      if (error) throw error
    } catch (e: any) {
      console.error(e)
      throw new Error(e.message || 'Wachtwoord herstellen mislukt')
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = async () => {
    setLoading(true)
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      setUser(null)
      setUserProfile(null)
      localStorage.removeItem('kraftedit_current_user')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Delete Account
  const deleteAccount = async () => {
    if (!user) return
    setLoading(true)
    try {
      if (!supabase) {
        // Fallback
        const profiles = getLocalProfilesList()
        const updatedList = profiles.filter(p => p.id !== user.uid)
        setLocalProfilesList(updatedList)
      } else {
        // Best effort: delete user profiles row in public
        await supabase.from('profiles').delete().eq('id', user.uid)
        await supabase.auth.signOut()
      }
      setUser(null)
      setUserProfile(null)
      localStorage.removeItem('kraftedit_current_user')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Update Profile Info
  const updateProfile = async (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => {
    if (!user || !userProfile) return
    setLoading(true)
    try {
      const updatedProfile: UserProfile = {
        ...userProfile,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      }

      await dbUpsertUserProfile(updatedProfile)
      setUserProfile(updatedProfile)

      // Update auth user display name locally
      const updatedUserRef: SupabaseUser = {
        ...user,
        displayName: data.displayName,
      }
      setUser(updatedUserRef)
      
      if (!supabase) {
        localStorage.setItem('kraftedit_current_user', JSON.stringify(updatedUserRef))
      }

      toast({
        title: 'Profiel bijgewerkt',
        description: 'Je wijzigingen zijn succesvol opgeslagen.',
      })
    } catch (e: any) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Bijwerken mislukt',
        description: e.message || 'Kon je profielwijzigingen niet opslaan.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isInitialized,
        refreshUserProfile,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        deleteAccount,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
