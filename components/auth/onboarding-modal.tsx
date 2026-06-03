'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'

export function OnboardingModal({ isOpen }: { isOpen: boolean }) {
  const { createProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createProfile({ username, displayName, bio: '', avatarUrl: '' })
      toast({ title: 'Profile set up!' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-obsidian-card p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-2">Set up your profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
             placeholder="Username" 
             value={username} 
             onChange={(e) => setUsername(e.target.value)}
             className="w-full h-10 rounded-xl border border-border bg-background px-3"
             required 
          />
          <input 
             placeholder="Display Name" 
             value={displayName} 
             onChange={(e) => setDisplayName(e.target.value)}
             className="w-full h-10 rounded-xl border border-border bg-background px-3"
             required 
          />
          <button type="submit" disabled={isLoading} className="w-full h-10 bg-neon rounded-xl text-obsidian font-bold">
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
