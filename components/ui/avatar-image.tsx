'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getSteveHeadBase64 } from '@/lib/skin-utils'

interface AvatarImageProps {
  src?: string | null
  alt: string
  className?: string
}

export function AvatarImage({ src, alt, className }: AvatarImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('')

  useEffect(() => {
    if (src) {
      setImageSrc(src)
    } else {
      setImageSrc(getSteveHeadBase64())
    }
  }, [src])

  const isSkinTexture = imageSrc && imageSrc.includes('#skin')

    if (isSkinTexture) {
    return (
      <div className={cn("relative overflow-hidden aspect-square select-none pointer-events-none", className)} data-slot="user-avatar-skin">
        <img
          src={imageSrc}
          alt={alt}
          className="absolute max-w-none origin-top-left"
          style={{
            width: '800%',
            height: '800%',
            left: '0',
            top: '0',
            transform: 'translate(-12.5%, -12.5%)',
            imageRendering: 'pixelated',
          }}
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden aspect-square", className)} data-slot="user-avatar-standard">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-obsidian-elevated text-xs font-bold text-muted-foreground select-none">
          {alt ? alt.charAt(0).toUpperCase() : 'U'}
        </div>
      )}
    </div>
  )
}
