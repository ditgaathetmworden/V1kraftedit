'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
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
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateProfile: (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => Promise<void>
  createProfile: (data: { username: string; displayName: string; bio: string; avatarUrl: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isInitialized: false,
  refreshUserProfile: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {},
  createProfile: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  // Load user profile
  const loadUser = async (sessionUser: any) => {
    const client = getSupabase()
    if (!client) return

    const u: MockUser = {
      uid: sessionUser.id,
      email: sessionUser.email || '',
      displayName: sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'User'
    }
    setUser(u)
    
    // Try fetch supabase profile
    const { data: profile, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
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
      setUserProfile(null)
    }
  }

  // Initialize DB in Supabase
  useEffect(() => {
    if (typeof window === 'undefined') return

    const client = getSupabase()

    if (client) {
      // 1. Initial Session Check
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          await loadUser(session.user)
        }
        setLoading(false)
        setIsInitialized(true)
      })

      // 2. Connect to real Supabase auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event: string, session: any) => {
          setLoading(true)
          if (session?.user) {
            await loadUser(session.user)
          } else {
            setUser(null)
            setUserProfile(null)
          }
          setLoading(false)
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    } else {
      setLoading(false)
      setIsInitialized(true)
    }
  }, [])

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
  }

  // Google Login
  const loginWithGoogle = async () => {
    setLoading(true)
    const client = getSupabase()
    if (!client) throw new Error('Supabase client not initialized')
    
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/profile' } })
      if (error) throw error
      return
    } catch (e: any) {
      console.error('Supabase Google OAuth failure:', e)
      throw new Error(e.message || 'Google signing options failed')
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
  }

  // Delete Account
  const deleteAccount = async () => {
    if (!user) return
    setLoading(true)
    try {
      const client = getSupabase()
      if (client) {
        // Real Supabase account deletes typically require custom backend service-role integration,
        // we'll trigger sign out.
        await client.auth.signOut()
      }
      
      setUser(null)
      setUserProfile(null)
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
    if (!client) throw new Error('Supabase client not initialized')

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
      
      // Update local state
      setUserProfile({
        ...userProfile,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      })
      setUser({
        ...user,
        displayName: data.displayName,
      })
      
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved successfully.',
      })
    } catch (e: any) {
      console.error('Supabase update profile details fails:', e)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: e.message || 'Could not save your profile changes.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Create Profile
  const createProfile = async (data: { username: string; displayName: string; bio: string; avatarUrl: string }) => {
    if (!user) return
    setLoading(true)
    const client = getSupabase()
    if (!client) throw new Error('Supabase client not initialized')
    
    try {
      const { error } = await client
        .from('profiles')
        .insert({
          id: user.uid,
          username: data.username.toUpperCase().trim(),
          display_name: data.displayName,
          bio: data.bio || '',
          avatar_url: data.avatarUrl || '',
          public_profile: true
        })
      
      if (error) throw error
      await refreshUserProfile()
    } catch (e: any) {
      console.error('Supabase profile creation fails:', e)
      throw new Error(e.message || 'Failed to create profile')
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
        loginWithGoogle,
        logout,
        deleteAccount,
        updateProfile,
        createProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
