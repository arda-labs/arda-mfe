import { useState } from "react"
import { Layers, Palette, RotateCcw, Sparkles, Type } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  SettingsTabbedShell,
  type SettingsTabItem,
} from "@workspace/ui/components/settings-tabbed-shell"
import { useAppearanceEditor } from "./hooks/useAppearanceEditor"
import { ThemeModeSelector } from "./components/ThemeModeSelector"
import { PresetsManager } from "./components/PresetsManager"
import { ColorPaletteSelector } from "./components/ColorPaletteSelector"
import { TypographyRadiusSelector } from "./components/TypographyRadiusSelector"
import { SurfaceSelector } from "./components/SurfaceSelector"
import { AppearancePreview } from "./components/AppearancePreview"
import { AppearanceActionBar } from "./components/AppearanceActionBar"

const appearanceTabs: SettingsTabItem[] = [
  { id: "all", label: "All Settings" },
  { id: "presets", label: "Presets & Templates", icon: Sparkles },
  { id: "colors", label: "Theme & Colors", icon: Palette },
  { id: "typography", label: "Typography & Radius", icon: Type },
  { id: "surfaces", label: "Surfaces & Chrome", icon: Layers },
]

export function AppearancePage() {
  const [activeTab, setActiveTab] = useState("all")

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
    <SettingsTabbedShell
      title="Appearance & Theme Studio"
      description="Configure color palettes, typography, layout geometry, and custom design templates"
      actions={
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
      }
      tabs={appearanceTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      sidebar={
        <AppearancePreview
          settings={draft}
          previewTheme={previewTheme}
          onTogglePreviewTheme={setPreviewTheme}
        />
      }
      stickyActionBar={
        <AppearanceActionBar
          isDirty={isDirty}
          saveFeedback={saveFeedback}
          onApply={applyDraft}
          onDiscard={discardDraft}
          onResetToDefault={resetToDefault}
        />
      }
    >
      <div className="space-y-8">
        {/* Section 1: Presets & Templates */}
        {(activeTab === "all" || activeTab === "presets") && (
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
        )}

        {activeTab === "all" && <div className="h-px bg-border/60" />}

        {/* Section 2 & 3: Theme Mode & Colors */}
        {(activeTab === "all" || activeTab === "colors") && (
          <div className="space-y-8">
            <ThemeModeSelector value={theme} onChange={setTheme} />
            <div className="h-px bg-border/60" />
            <ColorPaletteSelector
              selectedBaseColor={draft.baseColor}
              selectedChartPalette={draft.chartPalette}
              onSelectBaseColor={(c) => updateDraft("baseColor", c)}
              onSelectChartPalette={(p) => updateDraft("chartPalette", p)}
            />
          </div>
        )}

        {activeTab === "all" && <div className="h-px bg-border/60" />}

        {/* Section 4: Typography & Radius */}
        {(activeTab === "all" || activeTab === "typography") && (
          <TypographyRadiusSelector
            font={draft.font}
            headingFont={draft.headingFont}
            radius={draft.radius}
            onSelectFont={(f) => updateDraft("font", f)}
            onSelectHeadingFont={(hf) => updateDraft("headingFont", hf)}
            onSelectRadius={(r) => updateDraft("radius", r)}
          />
        )}

        {activeTab === "all" && <div className="h-px bg-border/60" />}

        {/* Section 5: Layout Surfaces */}
        {(activeTab === "all" || activeTab === "surfaces") && (
          <SurfaceSelector
            headerSurface={draft.headerSurface}
            sidebarSurface={draft.sidebarSurface}
            onSelectHeaderSurface={(s) => updateDraft("headerSurface", s)}
            onSelectSidebarSurface={(s) => updateDraft("sidebarSurface", s)}
          />
        )}
      </div>
    </SettingsTabbedShell>
  )
}
