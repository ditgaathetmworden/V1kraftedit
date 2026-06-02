import { useEffect } from 'react'
import { BrushTool } from '@/types/skin'

export function useKeyboardShortcuts(
  setCurrentTool: (tool: BrushTool) => void,
  handleUndo: () => void,
  handleRedo: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'p': setCurrentTool('pen'); break
          case 'e': setCurrentTool('eraser'); break
          case 'i': setCurrentTool('eyedropper'); break
          case 'g': setCurrentTool('bucket'); break
          case 's': setCurrentTool('shading'); break
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentTool, handleUndo, handleRedo])
}
