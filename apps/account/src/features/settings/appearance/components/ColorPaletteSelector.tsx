import { Check, Palette } from "lucide-react"
import { baseColors, chartPalettes } from "@workspace/theme/appearance"
import type { BaseColor, ChartPalette } from "@workspace/theme/appearance"
import { cn } from "@workspace/ui/lib/utils"

interface ColorPaletteSelectorProps {
  selectedBaseColor: BaseColor
  selectedChartPalette: ChartPalette
  onSelectBaseColor: (color: BaseColor) => void
  onSelectChartPalette: (palette: ChartPalette) => void
}

const chartPaletteDescriptions: Record<ChartPalette, string> = {
  default: "Balanced multi-spectral gradient tailored for general analytics",
  finance: "Emerald, sapphire, and gold hues for financial and ledger KPIs",
  cool: "Calm teal, cyan, and indigo tones for metrics and telemetry",
  warm: "Amber, coral, and red gradient for operational heatmaps and alerts",
}

export function ColorPaletteSelector({
  selectedBaseColor,
  selectedChartPalette,
  onSelectBaseColor,
  onSelectChartPalette,
}: ColorPaletteSelectorProps) {
  return (
    <section className="space-y-6">
      {/* Base Brand Color */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Palette className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                Brand & Accent Color
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Determines primary buttons, active navigation, focused rings, and
              interactive elements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {(Object.keys(baseColors) as BaseColor[]).map((key) => {
            const item = baseColors[key]
            const isSelected = selectedBaseColor === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectBaseColor(key)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-muted/40",
                  isSelected
                    ? "border-primary bg-primary/[0.05] shadow-xs ring-1 ring-primary/20"
                    : "border-border/70 bg-card/60"
                )}
              >
                <span
                  className="relative flex size-5.5 shrink-0 items-center justify-center rounded-full border border-black/15 shadow-sm"
                  style={{ background: item.swatch }}
                >
                  {isSelected && (
                    <Check className="size-3 text-white drop-shadow-xs" />
                  )}
                </span>
                <span className="truncate text-xs font-semibold text-foreground">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart Color Palettes */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Data & Chart Colors
          </h3>
          <p className="text-xs text-muted-foreground">
            Defines the 5-color sequence used across dashboard charts, bars, and
            telemetry
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(chartPalettes) as ChartPalette[]).map((key) => {
            const item = chartPalettes[key]
            const isSelected = selectedChartPalette === key
            const desc = chartPaletteDescriptions[key]

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectChartPalette(key)}
                className={cn(
                  "group flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                  isSelected
                    ? "border-primary bg-primary/[0.05] shadow-xs ring-1 ring-primary/20"
                    : "border-border/70 bg-card/60"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {item.label}
                  </span>
                  {isSelected && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-2.5" />
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {desc}
                </p>

                {/* 5-Color Spectrum Strip */}
                <div className="flex h-3 w-full overflow-hidden rounded-full border border-black/5 shadow-inner">
                  {item.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="h-full flex-1 transition-transform hover:scale-105"
                      style={{ background: color }}
                      title={`Step ${idx + 1}: ${color}`}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
