'use client'

import { useState } from 'react'
import { X, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const { login, register } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      onClose()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-sm animate-in slide-in-from-bottom-4 ease-out duration-500 rounded-t-3xl bg-obsidian-surface border border-border/50 p-6 sm:rounded-3xl sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <GoogleSignInButton />
        
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-obsidian-card rounded-lg border border-border focus:border-neon outline-none" required />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-obsidian-card rounded-lg border border-border focus:border-neon outline-none" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-obsidian-card rounded-lg border border-border focus:border-neon outline-none" required />
          </div>
          <button type="submit" className="w-full py-2 bg-neon text-obsidian rounded-lg font-bold">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-neon font-bold">
            {mode === 'login' ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}
