'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, Save, Plus } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import { SkinViewer3D } from '@/components/editor/skin-viewer-3d'
import { PixelCanvas2D } from '@/components/editor/pixel-canvas-2d'
import { BodyPartSelector } from '@/components/editor/body-part-selector'
import { LayerToggle } from '@/components/editor/layer-toggle'
import { CombinedToolbar } from '@/components/editor/combined-toolbar'
import { ColorPickerModal } from '@/components/editor/color-picker-modal'
import { CopyFaceSelector } from '@/components/editor/copy-face-selector'
import { SaveModal } from '@/components/editor/save-modal'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useEditorDraftLoading } from '@/hooks/use-editor-autosave'
import { useEditorActions } from '@/hooks/use-editor-actions'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { cn } from '@/lib/utils'
import type { HistoryState, SkinFormat } from '@/types/skin'
import { cloneImageData, imageDataToDataUrl } from '@/lib/skin-utils'
import { useAuth } from '@/components/providers/firebase-auth-provider'

export default function EditorPage() {
  const router = useRouter()
  const { userProfile, refreshUserProfile } = useAuth()
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [isLoading, setIsLoading] = useState(true)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showNewSkinConfirm, setShowNewSkinConfirm] = useState(false)
  const [showCopyFaceSelector, setShowCopyFaceSelector] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shadingMode, setShadingMode] = useState<'darken' | 'lighten'>('darken')
  
  const {
    skinImageData,
    skinFormat,
    skinUrl,
    selectedPart,
    selectedFace,
    selectedLayer,
    currentTool,
    brushSize,
    currentColor,
    palette,
    undoStack,
    redoStack,
    setSkinImageData,
    setSkinUrl,
    setSelectedPart,
    setSelectedFace,
    setSelectedLayer,
    setCurrentTool,
    setCurrentColor,
    pushHistory,
    undo,
    redo,
  } = useEditorStore()

  useEditorDraftLoading(setIsLoading)
  const { handleSave, handleNewSkin, handleFileUpload, handleDownload } = useEditorActions(
    setIsSaving,
    setShowSaveModal,
    setIsLoading,
    router
  )

  const handlePixelChange = useCallback((newImageData: ImageData) => {
    // Super-fast path: only update raw ImageData in store (does not trigger layout or base64 data url creation)
    setSkinImageData(newImageData)
  }, [setSkinImageData])

  const handleStrokeStart = useCallback(() => {
    if (skinImageData) {
      // Push history state exactly ONCE when the user starts a drawing stroke, rather than on every cursor move
      const historyState: HistoryState = {
        imageData: cloneImageData(skinImageData),
        layer: selectedLayer,
        timestamp: Date.now(),
      }
      pushHistory(historyState)
    }
  }, [skinImageData, selectedLayer, pushHistory])

  const handleStrokeEnd = useCallback((finalImageData: ImageData) => {
    // Generate base64 texture once at the absolute end of the user's stroke gesture instead of up to 60 times a second
    setSkinUrl(imageDataToDataUrl(finalImageData))
  }, [setSkinUrl])

  const handleUndo = useCallback(() => {
    const prevState = undo()
    if (prevState) {
      setSkinImageData(prevState.imageData)
      setSkinUrl(imageDataToDataUrl(prevState.imageData))
    }
  }, [undo, setSkinImageData, setSkinUrl])

  const handleRedo = useCallback(() => {
    const nextState = redo()
    if (nextState) {
      setSkinImageData(nextState.imageData)
      setSkinUrl(imageDataToDataUrl(nextState.imageData))
    }
  }, [redo, setSkinImageData, setSkinUrl])

  const handleCopyPart = useCallback(() => {
    // Open face selector modal
    setShowCopyFaceSelector(true)
  }, [])

  const handleCopyConfirm = useCallback(
    (newImageData: ImageData) => {
      if (!skinImageData) return
      
      // Save to history first
      const historyState: HistoryState = {
        imageData: cloneImageData(skinImageData),
        layer: selectedLayer,
        timestamp: Date.now(),
      }
      pushHistory(historyState)
      
      setSkinImageData(newImageData)
      setSkinUrl(imageDataToDataUrl(newImageData))
    },
    [skinImageData, selectedLayer, pushHistory, setSkinImageData, setSkinUrl]
  )

  useKeyboardShortcuts(setCurrentTool, handleUndo, handleRedo)

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {/* Header - compact */}
      <header className="shrink-0 border-b border-border bg-obsidian-surface/95 backdrop-blur-lg">
        <div className="flex h-11 items-center justify-between px-3">
          {/* Left: Upload and Download */}
          <div className="flex items-center gap-0.5">
            <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleDownload}
              disabled={!skinImageData}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground disabled:opacity-50"
              title="Download skin"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          
          {/* Center: Title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xs font-bold tracking-wide">
            <span className="text-neon">Skin</span>
            <span className="text-foreground"> Editor</span>
          </h1>
          
          {/* Right: Save and New skin */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!skinImageData}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground disabled:opacity-50"
              title="Save to profile"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowNewSkinConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-obsidian-elevated hover:text-foreground"
              title="New skin"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/90">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neon border-t-transparent" />
        </div>
      )}

      {/* Main Editor - flex grow to fill space */}
      <main className="flex min-h-0 flex-1 flex-col pb-16">
        {/* Body Part Selector - compact */}
        <section className="shrink-0 bg-obsidian-surface px-3 py-1.5">
          <BodyPartSelector
            selectedPart={selectedPart}
            selectedFace={selectedFace}
            onPartChange={setSelectedPart}
            onFaceChange={setSelectedFace}
          />
        </section>

        {/* 3D/2D View - flex-1 to take all available space */}
        <section 
          className="relative min-h-0 flex-1 -my-px"
          style={{ backgroundImage: 'url(/minecraft-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {viewMode === '3d' ? (
            <div className="relative h-full w-full">
              {!isLoading && (
                <SkinViewer3D
                  skinUrl={skinUrl}
                  className="h-full w-full"
                  animation="idle"
                  autoRotate={false}
                  selectedPart={selectedPart}
                  selectedFace={selectedFace}
                  showControls={true}
                />
              )}
              <button
                onClick={() => setViewMode('2d')}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-obsidian-elevated/90 px-2 py-1.5 text-[10px] font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-obsidian-card"
              >
                Edit 2D
              </button>
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center p-2">
              <PixelCanvas2D
                imageData={skinImageData}
                format={skinFormat}
                selectedPart={selectedPart}
                selectedFace={selectedFace}
                selectedLayer={selectedLayer}
                currentTool={currentTool}
                currentColor={currentColor}
                brushSize={brushSize}
                shadingMode={shadingMode}
                onPixelChange={handlePixelChange}
                onStrokeStart={handleStrokeStart}
                onStrokeEnd={handleStrokeEnd}
                onColorPick={setCurrentColor}
                className="max-h-full max-w-full rounded-xl"
              />
              <button
                onClick={() => setViewMode('3d')}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-obsidian-elevated/90 px-2 py-1.5 text-[10px] font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-obsidian-card"
              >
                View 3D
              </button>
            </div>
          )}
        </section>

        {/* Unified Control Bar */}
        <section className="shrink-0 border-t border-border bg-obsidian-surface px-3 py-2">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 max-w-4xl mx-auto">
            {viewMode === '2d' && (
              <div className="w-full md:w-56 flex-shrink-0">
                <LayerToggle
                  selectedLayer={selectedLayer}
                  onLayerChange={setSelectedLayer}
                />
              </div>
            )}
            <div className="w-full md:w-auto flex-shrink-0 min-w-0">
              <CombinedToolbar
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                currentColor={currentColor}
                onColorClick={() => setShowColorPicker(true)}
                onCopyPart={handleCopyPart}
                shadingMode={shadingMode}
                onShadingModeChange={setShadingMode}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        skinUrl={skinUrl}
        isSaving={isSaving}
      />

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        skinPalette={palette}
      />

      {/* New Skin Confirmation Modal */}
      {showNewSkinConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-obsidian-surface p-6">
            <h2 className="mb-2 text-lg font-bold text-foreground">New Skin</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Are you sure you want to create a new skin? Your current skin will be lost if you haven&apos;t saved it.
            </p>
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => handleNewSkin('64x64')}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-medium transition-colors",
                  skinFormat === '64x64' ? "bg-neon text-obsidian" : "bg-obsidian-card text-muted-foreground hover:bg-obsidian-elevated"
                )}
              >
                64x64
              </button>
              <button
                onClick={() => handleNewSkin('128x128')}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-medium transition-colors",
                  skinFormat === '128x128' ? "bg-neon text-obsidian" : "bg-obsidian-card text-muted-foreground hover:bg-obsidian-elevated"
                )}
              >
                128x128
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewSkinConfirm(false)}
                className="flex-1 rounded-xl border border-border bg-obsidian-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-obsidian-elevated"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewSkinConfirm(false)
                }}
                className="flex-1 rounded-xl bg-neon py-3 text-sm font-bold text-obsidian transition-colors hover:bg-neon/90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Face Selector Modal */}
      <CopyFaceSelector
        isOpen={showCopyFaceSelector}
        onClose={() => setShowCopyFaceSelector(false)}
        sourcePart={selectedPart}
        skinUrl={skinUrl}
        skinImageData={skinImageData}
        skinFormat={skinFormat}
        onConfirm={handleCopyConfirm}
      />
    </div>
  )
}
