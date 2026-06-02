import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useEditorStore } from '@/stores/editor-store'
import { SkinFormat } from '@/types/skin'
import { createBlankSkin, downloadSkin, imageDataToDataUrl, loadSkinFromFile } from '@/lib/skin-utils'
import { extractPalette } from '@/lib/brush-algorithms'
import { useToast } from '@/hooks/use-toast'
import { dbSaveSkin, dbUpsertUserProfile } from '@/lib/supabase'

export function useEditorActions(
  setIsSaving: (isSaving: boolean) => void,
  setShowSaveModal: (show: boolean) => void,
  setIsLoading: (isLoading: boolean) => void,
  router: any
) {
  const { userProfile, refreshUserProfile } = useAuth()
  const { toast } = useToast()
  const {
    skinImageData,
    skinFormat,
    skinUrl,
    setSkinImageData,
    setSkinFormat,
    setSkinUrl,
    setPalette,
    setCurrentColor
  } = useEditorStore()

  const handleSave = async (name: string, description: string, isPublic: boolean) => {
    setIsSaving(true)
    
    try {
      // Use clean Supabase database service which manages actual calls & fallbacks
      await dbSaveSkin({
        id: `skin-${Date.now()}`,
        name,
        description,
        format: skinFormat,
        imageUrl: skinUrl || '',
        isPublished: isPublic,
        authorId: userProfile?.id || 'user-1',
        authorName: userProfile?.displayName || userProfile?.username || 'AETHER_BLADE',
        authorAvatar: userProfile?.avatarUrl || '/avatars/aether.jpg',
        likes: 0,
        downloads: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      // Increment skinsCreated count in database
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          skinsCreated: (userProfile.skinsCreated || 0) + 1,
        }
        await dbUpsertUserProfile(updatedProfile)
        await refreshUserProfile()
      }
      
      setIsSaving(false)
      setShowSaveModal(false)
      
      // Clear draft in localStorage on successful save
      localStorage.removeItem('kraftedit_autosaved_skin')
      
      toast({
        title: isPublic ? 'Skin published' : 'Skin saved',
        description: isPublic 
          ? `Your skin "${name}" has been published to the gallery.` 
          : `Your skin "${name}" has been saved privately.`,
      })

      // Navigate to gallery if published, or profile if saved privately
      if (isPublic) {
        router.push('/gallery')
      } else {
        router.push('/profile')
      }
    } catch (e) {
      console.error('Failed to save skin:', e)
      toast({
        variant: 'destructive',
        title: 'Opslaan mislukt',
        description: 'De skin kon niet worden opgeslagen in de database.',
      })
      setIsSaving(false)
    }
  }

  const handleNewSkin = (format: SkinFormat = '64x64') => {
    const blankSkin = createBlankSkin(format)
    setSkinImageData(blankSkin)
    setSkinFormat(format)
    setSkinUrl(null)
    setPalette([])
    setCurrentColor({ r: 74, g: 222, b: 128, a: 255 })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      const imageData = await loadSkinFromFile(file, skinFormat)
      // Check format to switch format state to whatever we uploaded
      const format = imageData.width >= 128 ? '128x128' : '64x64'
      
      setSkinImageData(imageData)
      setSkinFormat(format)
      setSkinUrl(imageDataToDataUrl(imageData))
      
      const extractedPalette = extractPalette(imageData, 20)
      if (extractedPalette.length > 0) {
        setPalette(extractedPalette)
      }

      toast({
        title: 'Skin imported successfully',
        description: `${file.name} is ready for editing.`,
      })
    } catch (error) {
      console.error('Failed to load file:', error)
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Selected file could not be parsed as a skin texture.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (skinImageData) {
      downloadSkin(skinImageData, `ainecraft-skin-${Date.now()}.png`)
      toast({
        title: 'Download started',
        description: 'Skin file is downloading to your device.',
      })
    }
  }

  return { handleSave, handleNewSkin, handleFileUpload, handleDownload }
}
