'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Sparkles, Camera } from 'lucide-react'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, userProfile, updateProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createProfile({ username, displayName, bio, avatarUrl: '' })
      router.push('/profile')
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message || 'Failed to create profile'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background p-6">
      <h1 className="text-2xl font-bold mb-6">Complete your profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
         <div className="space-y-2">
           <label className="text-sm font-medium">Username</label>
           <input 
             value={username} 
             onChange={(e) => setUsername(e.target.value)} 
             className="w-full h-12 rounded-xl border border-border bg-background px-4"
             required 
           />
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">Display Name</label>
           <input 
             value={displayName} 
             onChange={(e) => setDisplayName(e.target.value)} 
             className="w-full h-12 rounded-xl border border-border bg-background px-4"
             required 
           />
         </div>
         <button type="submit" disabled={isLoading} className="w-full h-12 bg-neon rounded-xl text-obsidian font-bold">
            {isLoading ? 'Saving...' : 'Finish Setup'}
         </button>
      </form>
    </div>
  )
}
