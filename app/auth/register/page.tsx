'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile')
  }, [router])

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-zinc-950 text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon border-t-transparent" />
        <p className="text-xs">Je wordt doorgestuurd naar de profielpagina...</p>
      </div>
    </div>
  )
}
