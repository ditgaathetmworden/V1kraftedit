'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
import { useToast } from '@/hooks/use-toast'
import { auth, db } from '@/lib/firebase'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
} from 'firebase/firestore'

interface AuthContextType {
  user: User | null
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
  setOnboardingCompleted: async () => {},
})

export const useAuth = () => useContext(AuthContext)

const userProfileDoc = (uid: string) => doc(db, 'users', uid)

const mapProfile = (id: string, data: any): UserProfile => ({
  id,
  username: data.username || 'unknown',
  displayName: data.displayName || data.username || 'Player',
  bio: data.bio || '',
  avatarUrl: data.avatarUrl || '',
  skinsCreated: data.skinsCreated ?? 0,
  totalDownloads: data.totalDownloads ?? 0,
  followers: data.followers ?? 0,
  following: data.following ?? 0,
  publicProfile: data.publicProfile ?? true,
  onboardingCompleted: data.onboardingCompleted ?? false,
  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : new Date(),
})

const createProfileData = (user: User, username: string): UserProfile => ({
  id: user.uid,
  username,
  displayName: user.displayName || username,
  bio: '',
  avatarUrl: '',
  skinsCreated: 0,
  totalDownloads: 0,
  followers: 0,
  following: 0,
  publicProfile: true,
  onboardingCompleted: false,
  createdAt: new Date(),
})

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  const fetchOrCreateProfile = async (authUser: User): Promise<UserProfile> => {
    const profileRef = userProfileDoc(authUser.uid)
    const profileSnapshot = await getDoc(profileRef)

    if (profileSnapshot.exists()) {
      return mapProfile(profileSnapshot.id, profileSnapshot.data())
    }

    const emailPrefix = authUser.email?.split('@')[0] ?? `user-${authUser.uid}`
    const defaultUsername = emailPrefix.replace(/[^A-Za-z0-9_]/g, '').toLowerCase() || `user${authUser.uid.slice(0, 6)}`
    const profileData = createProfileData(authUser, defaultUsername)
    await setDoc(profileRef, {
      ...profileData,
      createdAt: serverTimestamp(),
    })
    return profileData
  }

  const refreshUserProfile = async () => {
    const authUser = auth.currentUser
    if (!authUser) return
    try {
      const profile = await fetchOrCreateProfile(authUser)
      setUserProfile(profile)
    } catch (error) {
      console.error('Unable to refresh user profile:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true)
      if (authUser) {
        setUser(authUser)
        try {
          const profile = await fetchOrCreateProfile(authUser)
          setUserProfile(profile)
        } catch (error) {
          console.error('Failed to load user profile:', error)
          setUserProfile(null)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
      setIsInitialized(true)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string) => {
    setLoading(true)
    try {
      const formattedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
      const existingUsernameQuery = query(
        collection(db, 'users'),
        where('username', '==', formattedUsername)
      )
      const existingUsernameSnapshot = await getDocs(existingUsernameQuery)
      if (!existingUsernameSnapshot.empty) {
        throw new Error('Username is already taken')
      }

      const result = await createUserWithEmailAndPassword(auth, email, password)
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: username,
        })
      }

      const profileData = createProfileData(result.user, formattedUsername)
      await setDoc(userProfileDoc(result.user.uid), {
        ...profileData,
        createdAt: serverTimestamp(),
      })
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      throw error instanceof Error ? error : new Error('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset failed:', error)
      throw error instanceof Error ? error : new Error('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await signOut(auth)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      await deleteDoc(userProfileDoc(auth.currentUser.uid))
      await deleteUser(auth.currentUser)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Delete account failed:', error)
      throw error instanceof Error ? error : new Error('Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => {
    if (!auth.currentUser || !userProfile) return
    setLoading(true)
    try {
      const profileRef = userProfileDoc(auth.currentUser.uid)
      await updateDoc(profileRef, {
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      })

      if (auth.currentUser.displayName !== data.displayName) {
        await updateFirebaseProfile(auth.currentUser, { displayName: data.displayName })
      }

      setUserProfile({
        ...userProfile,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      })
    } catch (error) {
      console.error('Profile update failed:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not save your profile changes.',
      })
      throw error instanceof Error ? error : new Error('Profile update failed')
    } finally {
      setLoading(false)
    }
  }

  const setOnboardingCompleted = async () => {
    if (!auth.currentUser || !userProfile) return
    setLoading(true)
    try {
      const profileRef = userProfileDoc(auth.currentUser.uid)
      await updateDoc(profileRef, {
        onboardingCompleted: true,
      })
      setUserProfile({
        ...userProfile,
        onboardingCompleted: true,
      })
    } catch (error) {
      console.error('Could not set onboarding completed:', error)
      throw error instanceof Error ? error : new Error('Could not complete onboarding')
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
        setOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
