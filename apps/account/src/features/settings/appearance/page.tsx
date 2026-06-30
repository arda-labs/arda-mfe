import { useEffect, useMemo, useState } from "react"
import {
  applyAppearance,
  baseColors,
  chartPalettes,
  defaultAppearance,
  fontPresets,
  radiusPresets,
  readAppearance,
  resetAppearance,
  saveAppearance,
} from "@workspace/core/appearance"
import type {
  AppearanceSettings,
  BaseColor,
  ChartPalette,
  FontPreset,
  RadiusPreset,
} from "@workspace/core/appearance"
import { useTheme } from "@workspace/theme"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

export function AppearancePage() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<AppearanceSettings>(() => readAppearance())

  useEffect(() => {
    applyAppearance(settings)
  }, [settings])

  const cssPreview = useMemo(() => buildCSSPreview(settings), [settings])

  const update = <TKey extends keyof AppearanceSettings>(key: TKey, value: AppearanceSettings[TKey]) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveAppearance(next)
  }

  const handleReset = () => {
    resetAppearance()
    setSettings(defaultAppearance)
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appearance</h1>
            <p className="text-sm text-muted-foreground">Customize the theme, layout, and colors of your workspace</p>
          </div>
          <SettingBlock label="Theme">
            <div className="inline-flex rounded-xl border bg-muted/40 p-1">
              {themeOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={cn(
                    "h-8 rounded-lg px-4 text-xs font-semibold transition-all duration-200",
                    theme === item.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </SettingBlock>
        </section>

        <SettingBlock label="Base Color">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(baseColors) as BaseColor[]).map((key) => {
              const item = baseColors[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update("baseColor", key)}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-semibold transition-all hover:bg-muted/75",
                    settings.baseColor === key 
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" 
                      : "border-muted-foreground/10"
                  )}
                >
                  <span className="size-4.5 rounded-full border border-black/10" style={{ background: item.swatch }} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </SettingBlock>

        <SettingBlock label="Chart Colors">
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(chartPalettes) as ChartPalette[]).map((key) => {
              const item = chartPalettes[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update("chartPalette", key)}
                  className={cn(
                    "flex h-14 items-center justify-between rounded-xl border px-4 text-xs font-semibold transition-all hover:bg-muted/75",
                    settings.chartPalette === key 
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" 
                      : "border-muted-foreground/10"
                  )}
                >
                  <span>{item.label}</span>
                  <span className="flex gap-1.5">
                    {item.colors.map((color) => (
                      <span key={color} className="size-4.5 rounded-full border border-black/10" style={{ background: color }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </SettingBlock>

        <div className="grid gap-6 sm:grid-cols-2">
          <SettingBlock label="Font">
            <Segmented
              value={settings.font}
              values={Object.keys(fontPresets) as FontPreset[]}
              getLabel={(key) => fontPresets[key].label}
              onChange={(value) => update("font", value)}
            />
          </SettingBlock>

          <SettingBlock label="Heading font">
            <Segmented
              value={settings.headingFont}
              values={Object.keys(fontPresets) as FontPreset[]}
              getLabel={(key) => fontPresets[key].label}
              onChange={(value) => update("headingFont", value)}
            />
          </SettingBlock>
        </div>

        <SettingBlock label="Radius">
          <Segmented
            value={settings.radius}
            values={Object.keys(radiusPresets) as RadiusPreset[]}
            getLabel={(key) => radiusPresets[key].label}
            onChange={(value) => update("radius", value)}
          />
        </SettingBlock>

        <div className="flex justify-end pt-4 border-t border-muted/50">
          <Button variant="outline" onClick={handleReset} className="rounded-xl px-5 py-4.5 text-xs font-semibold">
            Reset to defaults
          </Button>
        </div>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-muted/50 p-5 bg-card/45 backdrop-blur-md shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Theme Preview</h2>
              <p className="text-[11px] text-muted-foreground font-medium">Visualizing current style system</p>
            </div>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              Active
            </span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className="h-10 rounded-lg shadow-sm border border-black/5"
                  style={{ background: `var(--chart-${index})` }}
                />
              ))}
            </div>
            <div className="rounded-xl border border-muted/50 p-4 bg-muted/15 space-y-3">
              <h3 className="text-sm font-semibold">Example Component</h3>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg text-[11px] h-8">Save</Button>
                <Button size="sm" variant="outline" className="rounded-lg text-[11px] h-8">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </section>

        <pre className="overflow-auto rounded-2xl border bg-muted/20 p-4 text-[10px] font-mono leading-relaxed text-muted-foreground/80 max-h-[220px]">
          {cssPreview}
        </pre>
      </aside>
    </div>
  )
}

function SettingBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <Label className="text-xs font-bold text-muted-foreground/90 uppercase tracking-wider">{label}</Label>
      <div className="flex">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({
  value,
  values,
  getLabel,
  onChange,
}: {
  value: T
  values: T[]
  getLabel: (value: T) => string
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border bg-muted/40 p-1">
      {values.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "h-8 rounded-lg px-3.5 text-xs font-semibold transition-all duration-200",
            value === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {getLabel(item)}
        </button>
      ))}
    </div>
  )
}

function buildCSSPreview(settings: AppearanceSettings) {
  const base = baseColors[settings.baseColor]
  const charts = chartPalettes[settings.chartPalette]
  return [
    `--primary: ${base.light["--primary"]};`,
    `--radius: ${radiusPresets[settings.radius].value};`,
    `--font-sans: ${fontPresets[settings.font].stack};`,
    `--font-heading: ${fontPresets[settings.headingFont].stack};`,
    ...charts.colors.map((color, index) => `--chart-${index + 1}: ${color};`),
  ].join("\n")
}
