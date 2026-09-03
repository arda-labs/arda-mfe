import { RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useAppearanceEditor } from "./hooks/useAppearanceEditor"
import { ThemeModeSelector } from "./components/ThemeModeSelector"
import { PresetsManager } from "./components/PresetsManager"
import { ColorPaletteSelector } from "./components/ColorPaletteSelector"
import { TypographyRadiusSelector } from "./components/TypographyRadiusSelector"
import { SurfaceSelector } from "./components/SurfaceSelector"
import { AppearancePreview } from "./components/AppearancePreview"
import { AppearanceActionBar } from "./components/AppearanceActionBar"

export function AppearancePage() {
  const {
    theme,
    setTheme,
    previewTheme,
    setPreviewTheme,
    draft,
    isDirty,
    saveFeedback,
    builtinPresets,
    customPresets,
    updateDraft,
    applyDraft,
    discardDraft,
    resetToDefault,
    applyPreset,
    saveAsPreset,
    deletePreset,
    importPresets,
    exportPresets,
  } = useAppearanceEditor()

  return (
    <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col gap-6 overflow-y-auto px-4 py-6 md:px-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appearance & Theme Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure color palettes, typography, layout geometry, and custom
            design templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="h-8.5 gap-1.5 rounded-xl px-3 text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Column: Design System Controls */}
        <div className="space-y-8 pb-12">
          {/* Section 1: Presets & Templates */}
          <PresetsManager
            currentSettings={draft}
            builtinPresets={builtinPresets}
            customPresets={customPresets}
            onSelectPreset={applyPreset}
            onSaveCurrentAsPreset={saveAsPreset}
            onDeletePreset={deletePreset}
            onImportPresets={importPresets}
            onExportPresets={exportPresets}
          />

          <div className="h-px bg-border/60" />

          {/* Section 2: Theme Mode (Light / Dark / System) */}
          <ThemeModeSelector value={theme} onChange={setTheme} />

          <div className="h-px bg-border/60" />

          {/* Section 3: Brand Accent & Chart Palettes */}
          <ColorPaletteSelector
            selectedBaseColor={draft.baseColor}
            selectedChartPalette={draft.chartPalette}
            onSelectBaseColor={(c) => updateDraft("baseColor", c)}
            onSelectChartPalette={(p) => updateDraft("chartPalette", p)}
          />

          <div className="h-px bg-border/60" />

          {/* Section 4: Typography & Radius */}
          <TypographyRadiusSelector
            font={draft.font}
            headingFont={draft.headingFont}
            radius={draft.radius}
            onSelectFont={(f) => updateDraft("font", f)}
            onSelectHeadingFont={(hf) => updateDraft("headingFont", hf)}
            onSelectRadius={(r) => updateDraft("radius", r)}
          />

          <div className="h-px bg-border/60" />

          {/* Section 5: Layout Surfaces */}
          <SurfaceSelector
            headerSurface={draft.headerSurface}
            sidebarSurface={draft.sidebarSurface}
            onSelectHeaderSurface={(s) => updateDraft("headerSurface", s)}
            onSelectSidebarSurface={(s) => updateDraft("sidebarSurface", s)}
          />
        </div>

        {/* Right Column: Live Sandbox Preview */}
        <div>
          <AppearancePreview
            settings={draft}
            previewTheme={previewTheme}
            onTogglePreviewTheme={setPreviewTheme}
          />
        </div>
      </div>

      {/* Floating Sticky Action Bar */}
      <AppearanceActionBar
        isDirty={isDirty}
        saveFeedback={saveFeedback}
        onApply={applyDraft}
        onDiscard={discardDraft}
        onResetToDefault={resetToDefault}
      />
    </div>
  )
}
