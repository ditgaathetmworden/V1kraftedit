'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, User, RotateCcw, X } from 'lucide-react'
import { PixelCanvas2D } from '@/components/editor/pixel-canvas-2d'
import { CombinedToolbar } from '@/components/editor/combined-toolbar'
import { ColorPickerModal } from '@/components/editor/color-picker-modal'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { loadSkinFromUrl, imageDataToDataUrl, createDefaultSteveSkin } from '@/lib/skin-utils'
import type { BrushTool, RGBAColor } from '@/types/skin'

export default function EditAvatarPage() {
  const router = useRouter()
  const { userProfile, updateProfile } = useAuth()
  
  const [skinImageData, setSkinImageData] = useState<ImageData | null>(null)
  const [currentTool, setCurrentTool] = useState<BrushTool>('pen')
  const [currentColor, setCurrentColor] = useState<RGBAColor>({ r: 74, g: 222, b: 128, a: 255 })
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  useEffect(() => {
    if (!userProfile) return
    const avatarUrl = userProfile.avatarUrl
    
    if (!avatarUrl || avatarUrl.includes('mc-heads.net') || avatarUrl === '/avatars/aether.jpg' || avatarUrl.startsWith('/avatars/')) {
      const defaultSteveSkin = createDefaultSteveSkin()
      setSkinImageData(defaultSteveSkin)
    } else {
      loadSkinFromUrl(avatarUrl).then(data => {
        setSkinImageData(data)
      }).catch(err => {
        console.error('Failed to load avatar, using default Steve skin', err)
        setSkinImageData(createDefaultSteveSkin())
      })
    }
  }, [userProfile])

  const handlePixelChange = useCallback((newImageData: ImageData) => {
    setSkinImageData(newImageData)
  }, [])
  
  const handleSave = async () => {
    if (!skinImageData) return
    try {
      const dataUrl = imageDataToDataUrl(skinImageData)
      const finalAvatarUrl = dataUrl + '#skin'
      
      await updateProfile({
        displayName: userProfile?.displayName || userProfile?.username || 'User',
        bio: userProfile?.bio || '',
        avatarUrl: finalAvatarUrl,
        publicProfile: userProfile?.publicProfile ?? true,
      })
      
      router.push('/profile')
    } catch (e) {
      console.error('Failed to save avatar', e)
    }
  }

  return (
    <div className="flex h-[100dvh] w-full items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-6">
      <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 ease-out duration-500 rounded-t-3xl sm:rounded-3xl bg-obsidian-surface border border-border/50 p-5 pb-10 sm:pb-5 shadow-2xl flex flex-col gap-5 sm:zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon/10">
               <User className="h-4 w-4 text-neon" />
             </div>
             <h2 className="text-sm font-semibold tracking-wide text-foreground">
               Edit Avatar
             </h2>
           </div>
           <button
             onClick={() => router.back()}
             className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground"
           >
             <X className="h-4 w-4" />
           </button>
        </div>
        
        {/* Editor Area */}
        {skinImageData ? (
          <div 
            className="flex flex-col items-center justify-center rounded-2xl p-2 border border-border/30 relative overflow-hidden"
            style={{ backgroundImage: 'url(/minecraft-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 w-full flex justify-center">
              <PixelCanvas2D
                imageData={skinImageData}
                format='64x64'
                selectedPart='head'
                selectedFace='front'
                selectedLayer='base'
                currentTool={currentTool}
                currentColor={currentColor}
                brushSize={1}
                onPixelChange={handlePixelChange}
                onColorPick={setCurrentColor}
                className="max-w-[240px] w-full aspect-square rounded-xl shadow-2xl mix-blend-normal rendering-pixelated"
              />
            </div>
          </div>
        ) : (
          <div 
            className="flex aspect-square w-full max-w-[240px] mx-auto items-center justify-center rounded-2xl border border-border/30 relative overflow-hidden"
            style={{ backgroundImage: 'url(/minecraft-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
             <div className="absolute inset-0 bg-black/40"></div>
             <span className="text-xs text-white font-medium relative z-10">Loading...</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="pt-2">
           <CombinedToolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            onUndo={() => {}}
            onRedo={() => {}}
            canUndo={false}
            canRedo={false}
            currentColor={currentColor}
            onColorClick={() => setShowColorPicker(true)}
            hideCopyTool={true}
            className="max-w-full"
           />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-3">
           <button 
             onClick={() => setSkinImageData(createDefaultSteveSkin())} 
             className="flex-1 rounded-xl bg-obsidian-card py-3.5 text-sm font-semibold text-muted-foreground transition-all flex items-center justify-center gap-2 hover:bg-obsidian-elevated hover:text-foreground active:scale-[0.98]"
           >
             <RotateCcw className="h-4 w-4" /> Reset
           </button>
           <button 
             onClick={handleSave} 
             className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-neon py-3.5 text-sm font-bold text-obsidian transition-all hover:bg-neon-dim active:scale-[0.98]"
           >
             <Save className="h-4 w-4" /> Save Avatar
           </button>
        </div>

      </div>

      <ColorPickerModal
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        skinPalette={[]}
      />
    </div>
  )
}
