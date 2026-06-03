'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AvatarImage } from '@/components/ui/avatar-image'
import { Settings, Plus, Eye, Globe, Lock, Download, Heart, RefreshCw } from 'lucide-react'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SkinCard } from '@/components/gallery/skin-card'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { mockSkins } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { useRouter } from 'next/navigation'

type FilterOption = 'all' | 'published' | 'drafts'

export default function ProfilePage() {
  const router = useRouter()
  const { user, userProfile, loading, loginWithGoogle } = useAuth()
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [savedSkins, setSavedSkins] = useState<any[]>([])

  // Load saved skins from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('savedSkins')
    if (stored) {
      setSavedSkins(JSON.parse(stored))
    }
  }, [])

  // Combine mock skins with user's saved skins
  const userSkins = useMemo(() => {
    if (!userProfile) return []
    const mockUserSkins = mockSkins.filter((skin) => skin.authorId === userProfile.id)
    return [
      ...savedSkins.map(s => ({ 
        ...s, 
        imageUrl: s.imageUrl || s.textureData || '/default-skin.png',
        isPublished: s.isPublished !== undefined ? s.isPublished : (s.published !== undefined ? s.published : true),
        authorId: userProfile.id, 
        authorName: userProfile.username, 
        likes: s.likes || 0, 
        downloads: s.downloads || 0 
      })), 
      ...mockUserSkins
    ]
  }, [savedSkins, userProfile])

  const filteredSkins = useMemo(() => {
    if (filterBy === 'published') {
      return userSkins.filter((skin) => skin.isPublished)
    } else if (filterBy === 'drafts') {
      return userSkins.filter((skin) => !skin.isPublished)
    }
    return userSkins
  }, [filterBy, userSkins])

  const filterOptions: { value: FilterOption; label: string; icon: typeof Globe }[] = [
    { value: 'all', label: 'All', icon: Eye },
    { value: 'published', label: 'Public', icon: Globe },
    { value: 'drafts', label: 'Private', icon: Lock },
  ]

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-neon" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="relative min-h-[100dvh] flex flex-col bg-zinc-950 text-white overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-black z-0 opacity-80" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-neon/10 rounded-full blur-3xl z-0" />

        {/* Dummy/Blurred profile representation in the background to give the look of a popup overlay */}
        <div className="flex-1 flex flex-col opacity-10 filter blur-sm pointer-events-none select-none z-0">
          <header className="shrink-0 border-b border-zinc-900 bg-zinc-950 px-3 h-11 flex items-center justify-between">
            <div className="w-8" />
            <h1 className="text-xs font-bold tracking-wide text-zinc-400">My Profile</h1>
            <div className="w-8 h-8 rounded-lg bg-zinc-900" />
          </header>
          <div className="p-4 max-w-sm mx-auto w-full flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
          </div>
          <main className="flex-1 p-3 max-w-md mx-auto w-full">
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-[3/4] rounded-xl bg-zinc-900" />
              <div className="aspect-[3/4] rounded-xl bg-zinc-900" />
            </div>
          </main>
        </div>

        {/* Absolute Centered SignIn Popup Card */}
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div id="signin-modal" className="w-full max-w-sm rounded-[24px] border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-neon/5 rounded-full blur-2xl" />

            {/* Glowing Icon */}
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-neon/10 to-neon/5 border border-neon/20 shadow-[0_0_15px_rgba(var(--color-neon),0.05)]">
              <Sparkles className="h-7 w-7 text-neon animate-pulse" />
            </div>

            <h2 className="text-xl font-black tracking-tight text-white mb-2">Ontgrendel Ainecraft</h2>
            <p className="text-zinc-400 text-xs px-2 leading-relaxed mb-8">
              Meld je aan om je eigen Minecraft-skins op te slaan, te bewerken via AI en te delen met de community.
            </p>

            {/* Google Only Login Button */}
            <button
              onClick={loginWithGoogle}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-2xl bg-white text-zinc-900 font-bold text-xs uppercase tracking-wider transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer duration-200"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.76 14.97.67 12 .67 7.7.67 3.99 3.14 2.18 6.74l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"
                />
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#FBBC05"
                  d="m5.84 14.09-.81-.62-2.85 2.22C3.99 20.53 7.7 23 12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53z"
                />
                <path
                  fill="#34A853"
                  d="M5.84 9.91C4.97 12.51 4.97 15.49 5.84 18.09l-3.66 2.84C1.43 17.45 1 14.78 1 12s.43-5.45 1.18-8.93l3.66 2.84z"
                />
              </svg>
              Inloggen met Google
            </button>

            <div className="mt-8 text-[10px] text-zinc-500 font-medium">
              Geen wachtwoorden of registratie nodig &bull; Direct klaar
            </div>
          </div>
        </div>

        {/* Floating navbar background filler to support native looking pages */}
        <div className="mt-auto opacity-10 filter blur-sm pointer-events-none select-none z-0">
          <BottomNav />
        </div>
      </div>
    )
  }

  const formatShortNum = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-16">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-obsidian-surface/95 backdrop-blur-lg">
        <div className="flex h-11 items-center justify-between px-3">
          <div className="w-8" />
          <h1 className="text-xs font-bold tracking-wide">
            <span className="text-neon">My</span>
            <span className="text-foreground"> Profile</span>
          </h1>
          <Link 
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Profile Card */}
      <section className="shrink-0 border-b border-border bg-obsidian-surface px-4 py-4 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div 
              className="h-16 w-16 overflow-hidden rounded-xl border-2 border-neon bg-obsidian-elevated cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push('/profile/edit-avatar')}
            >
              <AvatarImage
                src={userProfile.avatarUrl}
                alt={userProfile.username}
                className="h-full w-full"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-obsidian-surface bg-neon" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">{userProfile.displayName || userProfile.username}</h2>
            <p className="text-[11px] text-neon font-semibold mb-1">@{userProfile.username}</p>
            {userProfile.bio && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 max-w-[210px] my-1 leading-snug">
                {userProfile.bio}
              </p>
            )}
            <div className="mt-1 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {userProfile.skinsCreated} skins
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {formatShortNum(userProfile.totalDownloads)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatShortNum(userProfile.followers)} followers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Create */}
      <section className="shrink-0 border-b border-border bg-obsidian-surface px-3 py-2">
        <div className="flex items-center gap-2 max-w-sm mx-auto w-full">
          {/* Filter Pills */}
          <div className="flex flex-1 gap-1.5">
            {filterOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFilterBy(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold tracking-wide transition-all cursor-pointer',
                  filterBy === value
                    ? 'pill-selected'
                    : 'pill-unselected'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Create Button */}
          <Link
            href="/editor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon text-obsidian transition-colors hover:bg-neon-bright"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Skins Grid */}
      <main className="flex-1 overflow-auto p-3 max-w-md mx-auto w-full">
        {filteredSkins.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredSkins.map((skin) => (
              <SkinCard key={skin.id} skin={skin} />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No skins yet</p>
            <Link
              href="/editor"
              className="mt-3 flex items-center gap-2 rounded-lg bg-neon px-4 py-2 text-xs font-semibold text-obsidian transition-colors hover:bg-neon-bright"
            >
              <Plus className="h-4 w-4" />
              Create Your First Skin
            </Link>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
