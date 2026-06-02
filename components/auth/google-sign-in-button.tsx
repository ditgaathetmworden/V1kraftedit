'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/supabase-auth-provider'

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { user, loginWithGoogle } = useAuth()

  if (user) {
    return <div className="text-xs text-muted-foreground">Signed in as {user.displayName}</div>
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await loginWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
    >
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  )
}
