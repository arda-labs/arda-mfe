import { useState } from "react"
import {
  Bookmark,
  Check,
  Download,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"
import { baseColors, chartPalettes } from "@workspace/theme/appearance"
import type {
  AppearancePreset,
  AppearanceSettings,
} from "@workspace/theme/appearance"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

interface PresetsManagerProps {
  currentSettings: AppearanceSettings
  builtinPresets: AppearancePreset[]
  customPresets: AppearancePreset[]
  onSelectPreset: (preset: AppearancePreset) => void
  onSaveCurrentAsPreset: (name: string, description?: string) => void
  onDeletePreset: (id: string) => void
  onImportPresets: (json: string) => {
    success: boolean
    count: number
    error?: string
  }
  onExportPresets: () => string
}

export function PresetsManager({
  currentSettings,
  builtinPresets,
  customPresets,
  onSelectPreset,
  onSaveCurrentAsPreset,
  onDeletePreset,
  onImportPresets,
  onExportPresets,
}: PresetsManagerProps) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetDesc, setPresetDesc] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [exportCopied, setExportCopied] = useState(false)

  const handleSave = () => {
    if (!presetName.trim()) return
    onSaveCurrentAsPreset(presetName.trim(), presetDesc.trim() || undefined)
    setPresetName("")
    setPresetDesc("")
    setSaveOpen(false)
  }

  const handleExport = async () => {
    const json = onExportPresets()
    await navigator.clipboard.writeText(json)
    setExportCopied(true)
    window.setTimeout(() => setExportCopied(false), 2000)
  }

  const handleImportSubmit = () => {
    if (!importJson.trim()) return
    const res = onImportPresets(importJson)
    if (res.success) {
      setImportMsg(`Imported ${res.count} preset(s) successfully!`)
      window.setTimeout(() => {
        setImportMsg(null)
        setImportJson("")
        setImportOpen(false)
      }, 1200)
    } else {
      setImportMsg(res.error || "Failed to parse presets JSON.")
    }
  }

  const isPresetActive = (preset: AppearancePreset) => {
    return (
      preset.settings.baseColor === currentSettings.baseColor &&
      preset.settings.chartPalette === currentSettings.chartPalette &&
      preset.settings.font === currentSettings.font &&
      preset.settings.headingFont === currentSettings.headingFont &&
      preset.settings.radius === currentSettings.radius
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              Theme Presets & Templates
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Switch between curated design systems or create your own custom
            styles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 rounded-lg text-xs"
            title="Export custom presets as JSON"
          >
            <Download className="size-3.5" />
            {exportCopied ? "Copied JSON" : "Export"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs"
            title="Import presets from JSON"
          >
            <Upload className="size-3.5" />
            Import
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setSaveOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="size-3.5" />
            Save Current as Preset
          </Button>
        </div>
      </div>

      {/* Builtin curated presets */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Curated Palettes
        </span>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {builtinPresets.map((preset) => {
            const active = isPresetActive(preset)
            const baseInfo = baseColors[preset.settings.baseColor]
            const chartInfo = chartPalettes[preset.settings.chartPalette]

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                  active
                    ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                    : "border-border/70 bg-card/60"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {preset.name}
                  </span>
                  {active && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-2.5" />
                    </span>
                  )}
                </div>

                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {preset.description}
                </p>

                {/* Swatch chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    className="size-3.5 rounded-full border border-black/15 shadow-2xs"
                    style={{ background: baseInfo?.swatch || "#4f46e5" }}
                    title={`Base: ${baseInfo?.label}`}
                  />
                  <div className="flex -space-x-1">
                    {chartInfo?.colors.slice(0, 3).map((col, idx) => (
                      <span
                        key={idx}
                        className="size-3 rounded-full border border-background shadow-2xs"
                        style={{ background: col }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground/80">
                    {preset.settings.font} • {preset.settings.radius}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* User Custom Presets */}
      {customPresets.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5">
            <Bookmark className="size-3.5 text-primary" />
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Your Custom Presets ({customPresets.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {customPresets.map((preset) => {
              const active = isPresetActive(preset)
              const baseInfo = baseColors[preset.settings.baseColor]
              const chartInfo = chartPalettes[preset.settings.chartPalette]

              return (
                <div
                  key={preset.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                    active
                      ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                      : "border-border/70 bg-card/60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className="flex w-full flex-col items-start gap-1 text-left"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {preset.name}
                      </span>
                      {active && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-2.5" />
                        </span>
                      )}
                    </div>
                    {preset.description && (
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {preset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span
                        className="size-3.5 rounded-full border border-black/15 shadow-2xs"
                        style={{ background: baseInfo?.swatch || "#4f46e5" }}
                      />
                      <div className="flex -space-x-1">
                        {chartInfo?.colors.slice(0, 3).map((col, idx) => (
                          <span
                            key={idx}
                            className="size-3 rounded-full border border-background shadow-2xs"
                            style={{ background: col }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground/80">
                        {preset.settings.font} • {preset.settings.radius}
                      </span>
                    </div>
                  </button>

                  <div className="mt-2 flex justify-end border-t border-border/40 pt-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeletePreset(preset.id)
                      }}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-destructive hover:bg-destructive/10"
                      title="Delete this custom preset"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Custom Preset</DialogTitle>
            <DialogDescription>
              Save your current appearance settings (colors, charts, font,
              radius, surfaces) as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="preset-name" className="text-xs font-semibold">
                Preset Name
              </Label>
              <Input
                id="preset-name"
                placeholder="e.g. Finance Dark Glow, Minimalist Clean..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-desc" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Input
                id="preset-desc"
                placeholder="Short note about when to use this style..."
                value={presetDesc}
                onChange={(e) => setPresetDesc(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!presetName.trim()}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preset Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Presets</DialogTitle>
            <DialogDescription>
              Paste JSON configuration containing one or more exported
              appearance presets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <textarea
              className="h-36 w-full rounded-xl border border-input bg-muted/20 p-3 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Paste exported JSON here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            {importMsg && (
              <p className="text-xs font-medium text-primary">{importMsg}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImportOpen(false)
                setImportMsg(null)
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImportSubmit}
              disabled={!importJson.trim()}
            >
              Import Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
