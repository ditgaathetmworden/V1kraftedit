'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/firebase-auth-provider'

interface OnboardingModalProps {
  isOpen: boolean
}

export function OnboardingModal({ isOpen }: OnboardingModalProps) {
  const { userProfile, updateProfile, setOnboardingCompleted } = useAuth()
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [username, setUsername] = useState(userProfile?.username || '')

  if (!isOpen) return null

  const handleSave = async () => {
    await updateProfile({
        displayName,
        bio: userProfile?.bio || '',
        avatarUrl: userProfile?.avatarUrl || '',
        publicProfile: userProfile?.publicProfile || true 
    })
    await setOnboardingCompleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 bg-obsidian-surface rounded-3xl border border-border/50">
        <h2 className="text-xl font-bold mb-4">Complete your profile</h2>
        <div className="space-y-4">
          <input type="text" placeholder="Username (Unique)" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2 bg-obsidian-card rounded-lg border border-border" />
          <input type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-2 bg-obsidian-card rounded-lg border border-border" />
          <button onClick={handleSave} className="w-full py-2 bg-neon text-obsidian rounded-lg font-bold">Save & Complete</button>
        </div>
      </div>
    </div>
  )
}
