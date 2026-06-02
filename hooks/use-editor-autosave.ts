import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { loadSkinFromUrl, imageDataToDataUrl } from '@/lib/skin-utils'
import { extractPalette } from '@/lib/brush-algorithms'

export function useEditorDraftLoading(setIsLoading: (loading: boolean) => void) {
  const {
    skinImageData,
    skinFormat,
    skinUrl,
    palette,
    setSkinImageData,
    setSkinFormat,
    setSkinUrl,
    setPalette,
    setCurrentColor
  } = useEditorStore()

  // Load skin on mount
  useEffect(() => {
    const initSkin = async () => {
      setIsLoading(true)
      
      try {
        const storedUrl = sessionStorage.getItem('editSkinUrl')
        
        if (storedUrl) {
          const imageData = await loadSkinFromUrl(storedUrl)
          const format = imageData.width >= 128 ? '128x128' : '64x64'
          
          setSkinImageData(imageData)
          setSkinFormat(format)
          setSkinUrl(imageDataToDataUrl(imageData))
          
          const extractedPalette = extractPalette(imageData, 20)
          if (extractedPalette.length > 0) {
            setPalette(extractedPalette)
            setCurrentColor(extractedPalette[0])
          }
          
          sessionStorage.removeItem('editSkinUrl')
          
          // Overwrite/update local draft immediately since we started a new session explicitly
          const draft = {
            skinUrl: imageDataToDataUrl(imageData),
            skinFormat: format,
            palette: extractedPalette.length > 0 ? extractedPalette : palette,
            updatedAt: new Date().toISOString()
          }
          localStorage.setItem('kraftedit_autosaved_skin', JSON.stringify(draft))
        } else {
          // Check for auto-saved draft
          const savedDraft = localStorage.getItem('kraftedit_autosaved_skin')
          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft)
              if (draft && draft.skinUrl) {
                const imageData = await loadSkinFromUrl(draft.skinUrl)
                const format = draft.skinFormat || (imageData.width >= 128 ? '128x128' : '64x64')
                
                setSkinImageData(imageData)
                setSkinFormat(format)
                setSkinUrl(draft.skinUrl)
                
                if (draft.palette && Array.isArray(draft.palette)) {
                  setPalette(draft.palette)
                  if (draft.palette.length > 0) {
                    setCurrentColor(draft.palette[0])
                  }
                }
              } else {
                throw new Error('Invalid draft')
              }
            } catch (e) {
              console.error('Failed to load auto-saved skin:', e)
              const imageData = await loadSkinFromUrl('/default-skin.png')
              setSkinImageData(imageData)
              setSkinFormat('64x64')
              setSkinUrl(imageDataToDataUrl(imageData))
            }
          } else {
            // Fallback to default skin
            const imageData = await loadSkinFromUrl('/default-skin.png')
            setSkinImageData(imageData)
            setSkinFormat('64x64')
            setSkinUrl(imageDataToDataUrl(imageData))
          }
        }
      } catch (error) {
        console.error('Failed to load skin:', error)
        try {
          const imageData = await loadSkinFromUrl('/default-skin.png')
          setSkinImageData(imageData)
          setSkinFormat('64x64')
          setSkinUrl(imageDataToDataUrl(imageData))
		} catch (fallbackError) {
          console.error('Failed to load fallback skin:', fallbackError)
		}
      } finally {
        setIsLoading(false)
      }
    }

    initSkin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSkinImageData, setSkinFormat, setSkinUrl, setPalette, setCurrentColor, setIsLoading])

  // Auto-save the current session state whenever it is edited
  useEffect(() => {
    if (!skinImageData) return

    const saveDraft = () => {
      try {
        const draftUrl = skinUrl || imageDataToDataUrl(skinImageData)
        const draft = {
          skinUrl: draftUrl,
          skinFormat,
          palette,
          updatedAt: new Date().toISOString()
        }
        localStorage.setItem('kraftedit_autosaved_skin', JSON.stringify(draft))
      } catch (err) {
        console.error('Failed to auto-save skin to localStorage:', err)
      }
    }

    // Debounce save slightly
    const timeout = setTimeout(saveDraft, 1000)
    return () => clearTimeout(timeout)
  }, [skinUrl, skinImageData, skinFormat, palette])
}
