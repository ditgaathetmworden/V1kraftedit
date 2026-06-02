'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
import { mockUsers } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'
import { getSupabase } from '@/lib/supabase'

export interface MockUser {
  uid: string
  email: string
  displayName: string
}

interface AuthContextType {
  user: MockUser | null
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
  const [user, setUser] = useState<MockUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  // Initialize DB in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Standard client setup helper
    const client = getSupabase()

    if (client) {
      // Connect to real Supabase auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event: string, session: any) => {
          if (session?.user) {
            const u: MockUser = {
              uid: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
            }
            setUser(u)
            
            // Try fetch supabase profile
            const { data: profile, error } = await client
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (!error && profile) {
              setUserProfile({
                id: profile.id,
                username: profile.username,
                displayName: profile.display_name,
                bio: profile.bio || '',
                avatarUrl: profile.avatar_url,
                skinsCreated: profile.skins_created || 0,
                totalDownloads: profile.total_downloads || 0,
                followers: profile.followers || 0,
                following: profile.following || 0,
                publicProfile: profile.public_profile ?? true,
                createdAt: new Date(profile.created_at)
              })
            } else {
              // Create virtual or local profile
              setUserProfile({
                id: session.user.id,
                username: u.displayName.toUpperCase(),
                displayName: u.displayName,
                bio: 'Crafting Minecraft identity.',
                avatarUrl: '',
                skinsCreated: 0,
                totalDownloads: 0,
                followers: 0,
                following: 0,
                createdAt: new Date()
              })
            }
          } else {
            setUser(null)
            setUserProfile(null)
          }
          setLoading(false)
          setIsInitialized(true)
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }

    // ─── Browser Fallback Storage Logic (Zero Config Sandbox mode) ────────────────────
    const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
    let profilesList: UserProfile[] = []
    if (!storedProfiles) {
      profilesList = [...mockUsers]
      localStorage.setItem('kraftedit_user_profiles', JSON.stringify(profilesList))
    } else {
      try {
        profilesList = JSON.parse(storedProfiles)
      } catch (e) {
        profilesList = [...mockUsers]
        localStorage.setItem('kraftedit_user_profiles', JSON.stringify(profilesList))
      }
    }

    const storedUser = localStorage.getItem('kraftedit_current_user')
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as MockUser
        setUser(u)
        const profile = profilesList.find((p) => p.id === u.uid)
        if (profile) {
          setUserProfile(profile)
        } else {
          setUserProfile(profilesList[0])
        }
      } catch (e) {
        bootstrapDefaultUser(profilesList)
      }
    } else {
      bootstrapDefaultUser(profilesList)
    }

    setLoading(false)
    setIsInitialized(true)
  }, [])

  const bootstrapDefaultUser = (profilesList: UserProfile[]) => {
    const defaultProfile = profilesList[0] || mockUsers[0]
    const defaultUser: MockUser = {
      uid: defaultProfile.id,
      email: `${defaultProfile.username.toLowerCase()}@kraftedit.com`,
      displayName: defaultProfile.displayName || defaultProfile.username,
    }
    setUser(defaultUser)
    setUserProfile(defaultProfile)
    localStorage.setItem('kraftedit_current_user', JSON.stringify(defaultUser))
  }

  const refreshUserProfile = async () => {
    const client = getSupabase()
    if (client && user) {
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.uid)
        .single()
      
      if (!error && profile) {
        setUserProfile({
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          bio: profile.bio || '',
          avatarUrl: profile.avatar_url,
          skinsCreated: profile.skins_created || 0,
          totalDownloads: profile.total_downloads || 0,
          followers: profile.followers || 0,
          following: profile.following || 0,
          publicProfile: profile.public_profile ?? true,
          createdAt: new Date(profile.created_at)
        })
        return
      }
    }

    if (!user) return
    const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
    if (storedProfiles) {
      try {
        const list = JSON.parse(storedProfiles) as UserProfile[]
        const profile = list.find((p) => p.id === user.uid)
        if (profile) {
          setUserProfile(profile)
        }
      } catch (e) {
        console.error('Failed to parse user profiles in refresh', e)
      }
    }
  }

  // Active Login
  const login = async (email: string, password: string) => {
    setLoading(true)
    const client = getSupabase()
    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw error
        return
      } catch (e: any) {
        console.error('Supabase Login error:', e)
        throw new Error(e.message || 'Supabase account login failed')
      } finally {
        setLoading(false)
      }
    }

    try {
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      const list = storedProfiles ? JSON.parse(storedProfiles) as UserProfile[] : [...mockUsers]
      
      const formattedUsername = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '')
      let profile = list.find(p => p.username === formattedUsername || p.id === 'user-1')
      if (!profile) {
        profile = list[0] || mockUsers[0]
      }

      const activeUser: MockUser = {
        uid: profile.id,
        email: email,
        displayName: profile.displayName || profile.username,
      }

      setUser(activeUser)
      setUserProfile(profile)
      localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
    } catch (e) {
      console.error(e)
      throw new Error('Inloggen is failed')
    } finally {
      setLoading(false)
    }
  }

  // Google Login
  const loginWithGoogle = async () => {
    setLoading(true)
    const client = getSupabase()
    if (client) {
      try {
        const { error } = await client.auth.signInWithOAuth({ provider: 'google' })
        if (error) throw error
        return
      } catch (e: any) {
        console.error('Supabase Google OAuth failure:', e)
        throw new Error(e.message || 'Google signing options failed')
      } finally {
        setLoading(false)
      }
    }

    try {
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      const list = storedProfiles ? JSON.parse(storedProfiles) as UserProfile[] : [...mockUsers]
      const profile = list[0] || mockUsers[0]

      const activeUser: MockUser = {
        uid: profile.id,
        email: 'google.explorer@kraftedit.com',
        displayName: profile.displayName || profile.username,
      }

      setUser(activeUser)
      setUserProfile(profile)
      localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
    } catch (e) {
      console.error(e)
      throw new Error('Google Sign-In failed')
    } finally {
      setLoading(false)
    }
  }

  // Active Registration
  const register = async (username: string, email: string, password: string) => {
    setLoading(true)
    const formattedUsername = username.toUpperCase().trim()
    const client = getSupabase()

    if (client) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: username.trim(),
              username: formattedUsername
            }
          }
        })
        if (error) throw error

        if (data.user) {
          // Attempt insert profile
          await client.from('profiles').insert({
            id: data.user.id,
            username: formattedUsername,
            display_name: username.trim(),
            bio: 'Pixel adventurer & Kraftedit creator.',
            avatar_url: '',
            skins_created: 0,
            total_downloads: 0,
            followers: 0,
            following: 0,
            public_profile: true
          })
        }
        return
      } catch (e: any) {
        console.error('Supabase registration fail:', e)
        throw new Error(e.message || 'Registration failure under Supabase server')
      } finally {
        setLoading(false)
      }
    }

    try {
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      const list = storedProfiles ? JSON.parse(storedProfiles) as UserProfile[] : [...mockUsers]
      
      // Check if username already exists
      const exists = list.some(p => p.username.toUpperCase() === formattedUsername)
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
        createdAt: new Date(),
      }

      const updatedList = [...list, newProfile]
      localStorage.setItem('kraftedit_user_profiles', JSON.stringify(updatedList))

      const activeUser: MockUser = {
        uid: newId,
        email: email,
        displayName: username.trim(),
      }

      setUser(activeUser)
      setUserProfile(newProfile)
      localStorage.setItem('kraftedit_current_user', JSON.stringify(activeUser))
    } catch (e: unknown) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Registration failed'
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  // Active Reset Password
  const resetPassword = async (email: string) => {
    setLoading(true)
    const client = getSupabase()
    if (client) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email)
        if (error) throw error
        return
      } catch (e: any) {
        console.error('Supabase password reset fails:', e)
        throw new Error(e.message || 'Failed to request password reset')
      } finally {
        setLoading(false)
      }
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 800))
    } catch (e) {
      console.error(e)
      throw new Error('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  // Active Logout
  const logout = async () => {
    const client = getSupabase()
    if (client) {
      await client.auth.signOut()
    }
    setUser(null)
    setUserProfile(null)
    localStorage.removeItem('kraftedit_current_user')
  }

  // Delete Account
  const deleteAccount = async () => {
    if (!user) return
    setLoading(true)
    try {
      const client = getSupabase()
      if (client) {
        // Real Supabase account deletes typically require custom backend service-role integration,
        // we'll trigger state clear locally and sign out.
        await client.auth.signOut()
      }
      
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      if (storedProfiles) {
        const list = JSON.parse(storedProfiles) as UserProfile[]
        const updatedList = list.filter(p => p.id !== user.uid)
        localStorage.setItem('kraftedit_user_profiles', JSON.stringify(updatedList))
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

  // Update Profile
  const updateProfile = async (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => {
    if (!user || !userProfile) return
    setLoading(true)
    const client = getSupabase()

    if (client) {
      try {
        const { error: authErr } = await client.auth.updateUser({
          data: { display_name: data.displayName }
        })
        if (authErr) throw authErr

        const { error: profileErr } = await client
          .from('profiles')
          .update({
            display_name: data.displayName,
            bio: data.bio,
            avatar_url: data.avatarUrl,
            public_profile: data.publicProfile
          })
          .eq('id', user.uid)
        
        if (profileErr) throw profileErr
      } catch (e: any) {
        console.error('Supabase update profile details fails:', e)
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: e.message || 'Could not save your profile changes.',
        })
        setLoading(false)
        return
      }
    }

    try {
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      if (storedProfiles) {
        const list = JSON.parse(storedProfiles) as UserProfile[]
        const updatedList = list.map(p => {
          if (p.id === user.uid) {
            return {
              ...p,
              displayName: data.displayName,
              bio: data.bio,
              avatarUrl: data.avatarUrl,
              publicProfile: data.publicProfile,
            }
          }
          return p
        })
        localStorage.setItem('kraftedit_user_profiles', JSON.stringify(updatedList))
      }

      const updatedProfile = {
        ...userProfile,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      }

      setUserProfile(updatedProfile)

      const updatedUserRef = {
        ...user,
        displayName: data.displayName,
      }
      setUser(updatedUserRef)
      localStorage.setItem('kraftedit_current_user', JSON.stringify(updatedUserRef))
      
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved successfully.',
      })
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not save your profile changes.',
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
