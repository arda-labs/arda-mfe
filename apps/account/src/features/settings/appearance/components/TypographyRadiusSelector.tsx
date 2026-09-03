import { fontPresets, radiusPresets } from "@workspace/theme/appearance"
import type { FontPreset, RadiusPreset } from "@workspace/theme/appearance"
import { cn } from "@workspace/ui/lib/utils"

interface TypographyRadiusSelectorProps {
  font: FontPreset
  headingFont: FontPreset
  radius: RadiusPreset
  onSelectFont: (font: FontPreset) => void
  onSelectHeadingFont: (headingFont: FontPreset) => void
  onSelectRadius: (radius: RadiusPreset) => void
}

const radiusVisuals: Record<
  RadiusPreset,
  { label: string; sub: string; previewClass: string }
> = {
  none: { label: "Sharp", sub: "0px", previewClass: "rounded-none" },
  sm: { label: "Subtle", sub: "6px", previewClass: "rounded-xs" },
  md: { label: "Medium", sub: "8px", previewClass: "rounded-md" },
  lg: { label: "Large", sub: "12px", previewClass: "rounded-xl" },
  xl: { label: "Extra", sub: "16px", previewClass: "rounded-2xl" },
}

export function TypographyRadiusSelector({
  font,
  headingFont,
  radius,
  onSelectFont,
  onSelectHeadingFont,
  onSelectRadius,
}: TypographyRadiusSelectorProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
          Typography & Geometry
        </h2>
        <p className="text-xs text-muted-foreground">
          Tune font hierarchy and corner radii across buttons, cards, dialogs,
          and inputs
        </p>
      </div>

      {/* Fonts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Body Font */}
        <div className="space-y-2.5 rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Body Font (Sans)
            </span>
            <span className="text-[11px] text-muted-foreground">
              {fontPresets[font].label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(fontPresets) as FontPreset[]).map((key) => {
              const item = fontPresets[key]
              const isSelected = font === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectFont(key)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-2xs"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className="text-base font-semibold"
                    style={{ fontFamily: item.stack }}
                  >
                    Aa 12
                  </span>
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Heading Font */}
        <div className="space-y-2.5 rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Heading Font
            </span>
            <span className="text-[11px] text-muted-foreground">
              {fontPresets[headingFont].label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(fontPresets) as FontPreset[]).map((key) => {
              const item = fontPresets[key]
              const isSelected = headingFont === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectHeadingFont(key)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-2xs"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className="text-base font-bold tracking-tight"
                    style={{ fontFamily: item.stack }}
                  >
                    Heading
                  </span>
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Corner Radius */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Corner Radius
          </span>
          <span className="text-xs text-muted-foreground">
            Current: {radiusPresets[radius].label} (
            {radiusPresets[radius].value})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(radiusPresets) as RadiusPreset[]).map((key) => {
            const visual = radiusVisuals[key]
            const isSelected = radius === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectRadius(key)}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.06] shadow-xs ring-1 ring-primary/20"
                    : "border-border/70 bg-card/60 hover:bg-muted/40"
                )}
              >
                {/* Visual corner shape preview */}
                <div className="flex size-10 items-center justify-center rounded-md bg-muted/60 p-1">
                  <div
                    className={cn(
                      "size-8 border-2 border-primary bg-primary/20 transition-all",
                      visual.previewClass
                    )}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {visual.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {visual.sub}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
