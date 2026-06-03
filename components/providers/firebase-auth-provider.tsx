'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/skin'
import { useToast } from '@/hooks/use-toast'
import { db, auth } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { RefreshCw, Sparkles, User, AtSign, ArrowRight } from 'lucide-react'

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

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { toast } = useToast()

  // Onboarding states
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false)
  const [onboardingUsername, setOnboardingUsername] = useState<string>('')
  const [onboardingDisplayName, setOnboardingDisplayName] = useState<string>('')
  const [onboardingError, setOnboardingError] = useState<string>('')
  const [submittingOnboarding, setSubmittingOnboarding] = useState<boolean>(false)

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true)
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(userDocRef)

          const mappedUser: MockUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
          }
          setUser(mappedUser)

          if (docSnap.exists()) {
            const data = docSnap.data()
            setUserProfile({
              id: firebaseUser.uid,
              username: data.username,
              displayName: data.displayName || '',
              bio: data.bio || '',
              avatarUrl: data.avatarUrl || '',
              skinsCreated: data.skinsCreated || 0,
              totalDownloads: data.totalDownloads || 0,
              followers: data.followers || 0,
              following: data.following || 0,
              publicProfile: data.publicProfile !== undefined ? data.publicProfile : true,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
            })
            setNeedsOnboarding(false)
          } else {
            // Document does not exist yet. Force onboarding
            setUserProfile(null)
            setNeedsOnboarding(true)

            // Pre-fill display name from google account if available
            if (firebaseUser.displayName) {
              setOnboardingDisplayName(firebaseUser.displayName)
            }
          }
        } catch (error) {
          console.error('Error loading Firestore profile:', error)
          setUserProfile(null)
          setNeedsOnboarding(true)
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setNeedsOnboarding(false)
      }
      setLoading(false)
      setIsInitialized(true)
    })

    return () => unsubscribe()
  }, [])

  const refreshUserProfile = async () => {
    if (!auth.currentUser) return
    try {
      const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (docSnap.exists()) {
        const data = docSnap.data()
        setUserProfile({
          id: auth.currentUser.uid,
          username: data.username,
          displayName: data.displayName || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
          skinsCreated: data.skinsCreated || 0,
          totalDownloads: data.totalDownloads || 0,
          followers: data.followers || 0,
          following: data.following || 0,
          publicProfile: data.publicProfile !== undefined ? data.publicProfile : true,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        })
      }
    } catch (e) {
      console.error('Error refreshing profile:', e)
    }
  }

  // Active Login (disabled: Gmail Only format)
  const login = async (email: string, password: string) => {
    throw new Error('E-mail login is uitgeschakeld. Gebruik Google Inloggen.')
  }

  // Google Login via native signInWithPopup
  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account',
      })
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      console.error('Google Sign-In failed:', e)
      toast({
        variant: 'destructive',
        title: 'Inloggen mislukt',
        description: e.message || 'Mislukt om in te loggen met Google.',
      })
      throw e
    } finally {
      setLoading(false)
    }
  }

  // Active Registration (disabled: Gmail Only format)
  const register = async (username: string, email: string, password: string) => {
    throw new Error('Handmatige registratie is uitgeschakeld. Gebruik Google Inloggen.')
  }

  // Active Reset Password (disabled)
  const resetPassword = async (email: string) => {
    throw new Error('Wachtwoord herstellen is uitgeschakeld.')
  }

  // Logout
  const logout = async () => {
    setLoading(true)
    try {
      await signOut(auth)
      setUser(null)
      setUserProfile(null)
      setNeedsOnboarding(false)
      toast({
        title: 'Aangemeld',
        description: 'Je bent succesvol uitgelogd.',
      })
    } catch (e: any) {
      console.error('Logout failed:', e)
    } finally {
      setLoading(false)
    }
  }

  // Delete Account from Auth and Firestore
  const deleteAccount = async () => {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      // Opt-out from auth completely and let rules block read/writes
      await signOut(auth)
      setUser(null)
      setUserProfile(null)
      setNeedsOnboarding(false)
      toast({
        title: 'Account afgemeld',
        description: 'Succesvol afgemeld.',
      })
    } catch (e) {
      console.error('Error deleting account:', e)
    } finally {
      setLoading(false)
    }
  }

  // Update Profile
  const updateProfile = async (data: { displayName: string; bio: string; avatarUrl: string; publicProfile: boolean }) => {
    if (!auth.currentUser || !userProfile) return
    setLoading(true)
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      const updateData = {
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      }
      await setDoc(userRef, updateData, { merge: true })

      setUserProfile({
        ...userProfile,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        publicProfile: data.publicProfile,
      })

      if (user) {
        setUser({
          ...user,
          displayName: data.displayName,
        })
      }

      toast({
        title: 'Profiel bijgewerkt',
        description: 'Je wijzigingen zijn succesvol opgeslagen.',
      })
    } catch (e: any) {
      console.error('Error updating profile:', e)
      toast({
        variant: 'destructive',
        title: 'Bijwerken mislukt',
        description: 'Er is een fout opgetreden bij het opslaan van je profiel.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Onboarding profile submission handler
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOnboardingError('')

    const usernameStr = onboardingUsername.trim().toLowerCase()
    const displayNameStr = onboardingDisplayName.trim()

    if (!usernameStr || !displayNameStr) {
      setOnboardingError('Gebruikersnaam en weergavenaam zijn verplicht.')
      return
    }

    if (usernameStr.length < 3 || usernameStr.length > 20) {
      setOnboardingError('Gebruikersnaam moet tussen 3 en 20 karakters lang zijn.')
      return
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(usernameStr)) {
      setOnboardingError('Gebruikersnaam mag alleen letters, cijfers, underscores (_) en streepjes (-) bevatten.')
      return
    }

    if (!auth.currentUser) {
      setOnboardingError('Authenticatiefout. Log opnieuw in.')
      return
    }

    setSubmittingOnboarding(true)

    try {
      // 1. Unique username check
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('username', '==', usernameStr))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        setOnboardingError('Deze gebruikersnaam is helaas al bezet.')
        setSubmittingOnboarding(false)
        return
      }

      // 2. Write document to users collection
      const uid = auth.currentUser.uid
      const fullProfile: UserProfile = {
        id: uid,
        username: usernameStr,
        displayName: displayNameStr,
        bio: 'Fresh Minecraft creator on Ainecraft.',
        avatarUrl: auth.currentUser.photoURL || '',
        skinsCreated: 0,
        totalDownloads: 0,
        followers: 0,
        following: 0,
        publicProfile: true,
        createdAt: new Date(),
      }

      // Write directly
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        username: usernameStr,
        displayName: displayNameStr,
        bio: fullProfile.bio,
        avatarUrl: fullProfile.avatarUrl,
        skinsCreated: 0,
        totalDownloads: 0,
        followers: 0,
        following: 0,
        publicProfile: true,
        createdAt: serverTimestamp(),
      })

      setUserProfile(fullProfile)
      setNeedsOnboarding(false)

      toast({
        title: 'Profiel geactiveerd!',
        description: `Welkom bij Ainecraft, @${usernameStr}!`,
      })
    } catch (err: any) {
      console.error('Error during onboarding save:', err)
      setOnboardingError(err.message || 'Kon je profiel niet opslaan. Probeer het opnieuw.')
    } finally {
      setSubmittingOnboarding(false)
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

      {/* Mandatory Onboarding Modal Overlay */}
      {needsOnboarding && (
        <div id="onboarding-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div id="onboarding-modal" className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-neon/5 rounded-full blur-2xl" />

            {/* Header */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10">
                <Sparkles className="h-6 w-6 text-neon" />
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-white mt-2">Laatste stap!</h2>
              <p className="text-xs text-zinc-400">Maak je Ainecraft spelersprofiel compleet.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-left">
              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="onboarding-displayname" className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                  <User className="h-3 w-3 text-neon" />
                  Weergavenaam
                </label>
                <input
                  id="onboarding-displayname"
                  type="text"
                  required
                  value={onboardingDisplayName}
                  onChange={(e) => setOnboardingDisplayName(e.target.value)}
                  placeholder="bijv. Steve Master"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-600 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
                />
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="onboarding-username" className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1">
                  <AtSign className="h-3 w-3 text-neon" />
                  Gebruikersnaam
                </label>
                <input
                  id="onboarding-username"
                  type="text"
                  required
                  value={onboardingUsername}
                  onChange={(e) => setOnboardingUsername(e.target.value)}
                  placeholder="bijv. steve_gamer12"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-600 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
                />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Minimaal 3 karakters. Geen spaties of speciale tekens, behalve _ en -.
                </p>
              </div>

              {/* Onboarding Error Display */}
              {onboardingError && (
                <div className="rounded-lg bg-red-950/40 border border-red-900/40 p-2.5 text-center text-[11px] text-red-400 font-semibold leading-relaxed">
                  {onboardingError}
                </div>
              )}

              {/* Submit trigger */}
              <button
                type="submit"
                disabled={submittingOnboarding}
                className="w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-neon text-xs font-bold uppercase tracking-wider text-black transition-all hover:bg-neon/90 disabled:opacity-50 cursor-pointer"
              >
                {submittingOnboarding ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Opslaan & Starten
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
