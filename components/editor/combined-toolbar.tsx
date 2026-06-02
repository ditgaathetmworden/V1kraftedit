'use client'

import { useState } from 'react'
import { 
  Pencil, 
  Eraser, 
  Pipette, 
  PaintBucket, 
  Sun,
  Undo2,
  Redo2,
  Copy,
} from 'lucide-react'
import type { BrushTool, RGBAColor } from '@/types/skin'
import { rgbaToHex } from '@/lib/brush-algorithms'
import { cn } from '@/lib/utils'

interface CombinedToolbarProps {
  currentTool: BrushTool
  onToolChange: (tool: BrushTool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  currentColor: RGBAColor
  onColorClick: () => void
  onCopyPart?: () => void
  shadingMode?: 'darken' | 'lighten'
  onShadingModeChange?: (mode: 'darken' | 'lighten') => void
  hideCopyTool?: boolean
  className?: string
}

const TOOLS: Array<{ id: BrushTool; icon: React.ReactNode; label: string; shortcut?: string }> = [
  { id: 'pen', icon: <Pencil className="h-5 w-5 md:h-5 md:w-5" />, label: 'Pen', shortcut: 'P' },
  { id: 'eraser', icon: <Eraser className="h-5 w-5 md:h-5 md:w-5" />, label: 'Eraser', shortcut: 'E' },
  { id: 'eyedropper', icon: <Pipette className="h-5 w-5 md:h-5 md:w-5" />, label: 'Eyedropper', shortcut: 'I' },
  { id: 'bucket', icon: <PaintBucket className="h-5 w-5 md:h-5 md:w-5" />, label: 'Bucket Fill', shortcut: 'G' },
  { id: 'shading', icon: <Sun className="h-5 w-5 md:h-5 md:w-5" />, label: 'Shading (Darken/Lighten)', shortcut: 'S' },
  { id: 'copy', icon: <Copy className="h-5 w-5 md:h-5 md:w-5" />, label: 'Copy to similar parts', shortcut: 'C' },
]

export function CombinedToolbar({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentColor,
  onColorClick,
  onCopyPart,
  shadingMode = 'darken',
  onShadingModeChange,
  hideCopyTool,
  className,
}: CombinedToolbarProps) {
  const [localShadingMode, setLocalShadingMode] = useState<'darken' | 'lighten'>(shadingMode)

  const activeTools = TOOLS.filter((tool) => {
    if (hideCopyTool && tool.id === 'copy') return false
    return true
  })

  const handleToolClick = (toolId: BrushTool) => {
    if (toolId === 'copy') {
      // Copy tool triggers action immediately
      onCopyPart?.()
      return
    }
    if (toolId === 'shading' && currentTool === 'shading') {
      // Toggle between darken/lighten when clicking shading tool again
      const newMode = localShadingMode === 'darken' ? 'lighten' : 'darken'
      setLocalShadingMode(newMode)
      onShadingModeChange?.(newMode)
    } else {
      onToolChange(toolId)
    }
  }

  return (
    <div className={cn('flex w-full md:w-auto items-center justify-between md:justify-center md:gap-2 rounded-xl bg-obsidian-card p-1 max-w-full overflow-hidden mx-auto', className)}>
      {/* Tools */}
      {activeTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleToolClick(tool.id)}
          className={cn(
            'flex h-[2.125rem] w-[2.125rem] min-[375px]:h-9 min-[375px]:w-9 md:h-10 md:w-10 flex-shrink-0 items-center justify-center rounded-lg transition-all relative',
            currentTool === tool.id
              ? 'bg-neon text-obsidian neon-glow-sm'
              : 'text-muted-foreground hover:bg-obsidian-elevated hover:text-foreground'
          )}
          title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}${tool.id === 'shading' ? ` - ${localShadingMode === 'darken' ? 'Darken' : 'Lighten'}` : ''}`}
        >
          {tool.icon}
          {tool.id === 'shading' && currentTool === 'shading' && (
            <span className="absolute -bottom-0.5 text-[8px] font-bold">
              {localShadingMode === 'darken' ? '-' : '+'}
            </span>
          )}
        </button>
      ))}

      {/* Subtle Vertical Divider */}
      <div className="h-4 sm:h-5 w-[1px] bg-border/20 flex-shrink-0 mx-px min-[375px]:mx-0.5" />

      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'flex h-[2.125rem] w-[2.125rem] min-[375px]:h-9 min-[375px]:w-9 md:h-10 md:w-10 flex-shrink-0 items-center justify-center rounded-lg transition-all',
          canUndo
            ? 'text-muted-foreground hover:bg-obsidian-elevated hover:text-foreground'
            : 'cursor-not-allowed text-muted-foreground/30'
        )}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-5 w-5" />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          'flex h-[2.125rem] w-[2.125rem] min-[375px]:h-9 min-[375px]:w-9 md:h-10 md:w-10 flex-shrink-0 items-center justify-center rounded-lg transition-all',
          canRedo
            ? 'text-muted-foreground hover:bg-obsidian-elevated hover:text-foreground'
            : 'cursor-not-allowed text-muted-foreground/30'
        )}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-5 w-5" />
      </button>

      {/* Subtle Vertical Divider */}
      <div className="h-4 sm:h-5 w-[1px] bg-border/20 flex-shrink-0 mx-px min-[375px]:mx-0.5" />

      {/* Color Button */}
      <button
        onClick={onColorClick}
        className="h-[2.125rem] w-[2.125rem] min-[375px]:h-9 min-[375px]:w-9 md:h-10 md:w-10 flex-shrink-0 rounded-lg border-2 border-border transition-all hover:border-foreground/50 active:scale-95"
        style={{ backgroundColor: rgbaToHex(currentColor) }}
        title="Open color picker"
      />
    </div>
  )
}
