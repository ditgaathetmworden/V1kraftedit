'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Trash2, 
  LogOut,
  Moon,
  Sun,
  Globe,
  Lock,
  Camera,
  RefreshCw
} from 'lucide-react'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useTheme } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { AvatarImage } from '@/components/ui/avatar-image'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { user, userProfile, loading, logout, deleteAccount, updateProfile } = useAuth()

  const [username, setUsername] = useState(userProfile?.username || '')
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [avatar, setAvatar] = useState(userProfile?.avatarUrl || '')
  const [publicProfile, setPublicProfile] = useState(userProfile?.publicProfile ?? true)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Populate state with profile values
  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '')
      setDisplayName(userProfile.displayName || '')
      setBio(userProfile.bio || '')
      setAvatar(userProfile.avatarUrl || '')
      setPublicProfile(userProfile.publicProfile ?? true)
    }
  }, [userProfile])

  // Track changes against database values
  useEffect(() => {
    if (userProfile) {
      const changed = 
        displayName !== (userProfile.displayName || '') ||
        bio !== (userProfile.bio || '') ||
        avatar !== (userProfile.avatarUrl || '') ||
        publicProfile !== (userProfile.publicProfile ?? true)
      setHasChanges(changed)
    }
  }, [displayName, bio, avatar, publicProfile, userProfile])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatar,
        publicProfile: publicProfile,
      })
      setHasChanges(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = () => {
    router.push('/profile/edit-avatar')
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
    } catch (err) {
      console.error('Failed to log out:', err)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    if (confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
      try {
        setIsSaving(true)
        await deleteAccount()
        router.push('/auth/login')
      } catch (err: any) {
        console.error('Account deletion error:', err)
      } finally {
        setIsSaving(false)
      }
    }
  }

  if (loading || !userProfile) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-neon" />
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-16">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-obsidian-surface/95 backdrop-blur-lg">
        <div className="flex h-11 items-center justify-between px-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xs font-bold tracking-wide">
            <span className="text-neon">Settings</span>
          </h1>
          {hasChanges ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-neon px-3 py-1.5 text-xs font-bold text-obsidian transition-colors hover:bg-neon-bright cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto max-w-md mx-auto w-full">
        {/* Profile Section */}
        <section className="border-b border-border bg-obsidian-surface p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
            Profile
          </h3>
          
          {/* Avatar */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div 
                className="h-16 w-16 overflow-hidden rounded-xl border-2 border-neon bg-obsidian-elevated cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => router.push('/profile/edit-avatar')}
              >
                <AvatarImage src={avatar} alt={username || 'User'} className="h-full w-full" />
              </div>
              <button 
                onClick={handleAvatarChange}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-neon text-obsidian transition-colors hover:bg-neon-bright cursor-pointer border border-background"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Profile picture</p>
              <p className="text-xs text-muted-foreground">Tap to edit your custom avatar face</p>
            </div>
          </div>

          {/* Username (Unique & Immutable) */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Unique Handle (Username)
            </label>
            <input
              type="text"
              value={username}
              disabled
              className="w-full rounded-lg border border-border bg-obsidian-card px-3 py-2.5 text-sm text-muted-foreground focus:outline-none opacity-60 cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-obsidian-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
              placeholder="Enter display name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-obsidian-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
              placeholder="Tell others about yourself"
            />
          </div>
        </section>

        {/* Preferences Section */}
        <section className="border-b border-border bg-obsidian-surface p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
            Preferences
          </h3>
          
          <div className="space-y-2">
            {/* Dark/Light Mode Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-obsidian-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-obsidian-elevated text-muted-foreground">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {isDark ? 'Dark theme active' : 'Light theme active'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                  isDark ? 'bg-neon' : 'bg-obsidian-elevated'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                    isDark ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Profile Visibility Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-obsidian-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-obsidian-elevated text-muted-foreground">
                  {publicProfile ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Public Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {publicProfile ? 'Everyone can see your profile' : 'Only you can see your profile'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPublicProfile(!publicProfile)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                  publicProfile ? 'bg-neon' : 'bg-obsidian-elevated'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                    publicProfile ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account Actions */}
        <section className="p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-destructive">
            Account
          </h3>
          
          <div className="space-y-2">
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl bg-obsidian-card p-3 transition-colors hover:bg-obsidian-elevated active:scale-[0.99] cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-obsidian-elevated text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-foreground">Log out</p>
            </button>

            {/* Delete Account */}
            <button
              onClick={handleDeleteAccount}
              className="flex w-full items-center gap-3 rounded-xl bg-obsidian-card p-3 transition-colors hover:bg-destructive/10 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-destructive">Delete account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
