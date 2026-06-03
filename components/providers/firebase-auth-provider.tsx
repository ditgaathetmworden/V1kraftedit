'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
import { mockUsers } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'

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
  setOnboardingCompleted: () => Promise<void>
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

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  // Initialize DB in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Ensure mock users database exists in localStorage
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

    // 2. Load or bootstrap logged in user
    const storedUser = localStorage.getItem('kraftedit_current_user')
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as MockUser
        setUser(u)
        const profile = profilesList.find((p) => p.id === u.uid)
        if (profile) {
          setUserProfile(profile)
        } else {
          // If profile is somehow missing, find fallback or make one
          setUserProfile(profilesList[0])
        }
      } catch (e) {
        bootstrapDefaultUser(profilesList)
      }
    } else {
      // Auto-login to the default mock user AETHER_BLADE so the app is pre-filled and completely ready to use
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
      throw new Error('Inloggen is mislukt')
    } finally {
      setLoading(false)
    }
  }

  // Google Login
  const loginWithGoogle = async () => {
    setLoading(true)
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
    try {
      const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
      const list = storedProfiles ? JSON.parse(storedProfiles) as UserProfile[] : [...mockUsers]
      
      const formattedUsername = username.toUpperCase().trim()
      
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
        onboardingCompleted: false, // Default onboarding incomplete
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
    try {
      // Just mock successful sending
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
    setUser(null)
    setUserProfile(null)
    localStorage.removeItem('kraftedit_current_user')
  }

  // Delete Account
  const deleteAccount = async () => {
    if (!user) return
    setLoading(true)
    try {
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

  const setOnboardingCompleted = async () => {
    if (!user || !userProfile) return
    const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
    if (storedProfiles) {
      const list = JSON.parse(storedProfiles) as UserProfile[]
      const updatedList = list.map(p => {
        if (p.id === user.uid) {
          return { ...p, onboardingCompleted: true }
        }
        return p
      })
      localStorage.setItem('kraftedit_user_profiles', JSON.stringify(updatedList))
      setUserProfile({ ...userProfile, onboardingCompleted: true })
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
        setOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
