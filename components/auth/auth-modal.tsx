'use client'

import React from 'react'
import { GoogleSignInButton } from './google-sign-in-button'

export function AuthModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-obsidian-card p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-2">Welcome</h2>
        <p className="text-sm text-muted-foreground mb-6">Please sign in to continue.</p>
        <GoogleSignInButton />
      </div>
    </div>
  )
}
