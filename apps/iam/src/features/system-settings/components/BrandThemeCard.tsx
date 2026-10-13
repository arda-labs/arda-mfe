import { Check } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import {
  BRAND_PRESETS,
  chartPalettes,
  contrastWithWhite,
  DEFAULT_BRAND_COLOR,
  isHexColor,
  MIN_BRAND_CONTRAST,
  type ChartPalette,
} from "@workspace/theme/brand"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

const paletteSwatches: Record<ChartPalette, string[]> = {
  ...chartPalettes,
  // The built-in palette lives in globals.css; show its first five colours.
  default: [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`),
}

/**
 * Organisation brand colour and chart palette (design board 08). Applied to
 * every user through the public branding endpoint; users cannot override it.
 */
export function BrandThemeCard({
  brandColor,
  chartPalette,
  onBrandColorChange,
  onChartPaletteChange,
}: {
  brandColor: string
  chartPalette: ChartPalette
  onBrandColorChange: (value: string) => void
  onChartPaletteChange: (value: ChartPalette) => void
}) {
  const { t } = useI18n()
  const valid = isHexColor(brandColor)
  const contrast = valid ? contrastWithWhite(brandColor) : 0
  const readable = contrast >= MIN_BRAND_CONTRAST

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("iam.system_settings.theme.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("iam.system_settings.theme.description")}
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <div role="radiogroup" aria-label={t("iam.system_settings.theme.brand_color")} className="flex flex-wrap gap-2">
            {BRAND_PRESETS.map((preset) => {
              const selected = brandColor.toLowerCase() === preset.color
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onBrandColorChange(preset.color)}
                  className={cn(
                    "flex w-28 flex-col gap-1.5 rounded-xl border p-2 text-left text-xs font-medium transition-colors hover:border-primary/50",
                    selected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <span className="flex h-8 items-center justify-center rounded-md text-white" style={{ background: preset.color }}>
                    {selected ? <Check className="size-4" aria-hidden /> : null}
                  </span>
                  {t(`iam.system_settings.theme.preset.${preset.id}`)}
                </button>
              )
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("iam.system_settings.theme.brand_color")}
              htmlFor="brand-color"
              error={
                !valid
                  ? t("iam.system_settings.theme.invalid_hex")
                  : !readable
                    ? t("iam.system_settings.theme.low_contrast", {
                        ratio: contrast.toFixed(1),
                      })
                    : undefined
              }
              description={
                valid && readable
                  ? t("iam.system_settings.theme.contrast_ok", {
                      ratio: contrast.toFixed(1),
                    })
                  : undefined
              }
            >
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={t("iam.system_settings.theme.pick_color")}
                  value={valid ? brandColor : DEFAULT_BRAND_COLOR}
                  onChange={(event) => onBrandColorChange(event.target.value)}
                  className="h-control w-11 shrink-0 cursor-pointer rounded-md border bg-background p-1"
                />
                <Input
                  id="brand-color"
                  value={brandColor}
                  onChange={(event) => onBrandColorChange(event.target.value.trim())}
                  className="font-mono"
                  aria-invalid={!valid || !readable}
                  maxLength={7}
                />
              </div>
            </FormField>
            <FormField label={t("iam.system_settings.theme.chart_palette")}>
              <div role="radiogroup" aria-label={t("iam.system_settings.theme.chart_palette")} className="grid grid-cols-2 gap-2">
                {(Object.keys(paletteSwatches) as ChartPalette[]).map((palette) => (
                  <button
                    key={palette}
                    type="button"
                    role="radio"
                    aria-checked={chartPalette === palette}
                    onClick={() => onChartPaletteChange(palette)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg border p-2 text-left text-xs font-medium hover:border-primary/50",
                      chartPalette === palette && "border-primary ring-2 ring-primary/20"
                    )}
                  >
                    <span aria-hidden className="flex h-3 overflow-hidden rounded-sm">
                      {paletteSwatches[palette].map((color) => (
                        <span key={color} className="flex-1" style={{ background: color }} />
                      ))}
                    </span>
                    {t(`iam.system_settings.theme.palette.${palette}`)}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        </div>
        <div aria-hidden className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {t("iam.system_settings.theme.preview")}
          </span>
          <span
            className="flex h-control items-center justify-center rounded-md px-4 text-sm font-semibold text-white"
            style={{ background: valid ? brandColor : DEFAULT_BRAND_COLOR }}
          >
            {t("iam.system_settings.actions.save")}
          </span>
          <span className="flex items-center gap-2">
            <Badge variant="secondary">{t("iam.system_settings.badge.global")}</Badge>
            <span className="text-sm font-medium" style={{ color: valid ? brandColor : undefined }}>
              {t("iam.system_settings.theme.link_sample")}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
