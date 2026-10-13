import { useState } from "react"
import { Info } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { useTheme } from "@workspace/theme"
import {
  readPreferences,
  savePreferences,
  type Density,
  type FontScale,
  type UserPreferences,
} from "@workspace/theme/appearance"
import { PageHeader } from "@workspace/ui/components/page-header"
import { cn } from "@workspace/ui/lib/utils"
import { ChoiceGroup } from "./components/ChoiceGroup"

type ThemeMode = "light" | "dark" | "system"

function ModePreview({ mode }: { mode: ThemeMode }) {
  const pane = (dark: boolean) => (
    <span className={cn("flex flex-1 gap-1 p-1.5", dark ? "bg-[#0b0f19]" : "bg-[#f1f2f5]")}>
      <span className={cn("w-3 rounded-sm", dark ? "bg-[#161d2d]" : "bg-white")} />
      <span className={cn("flex-1 rounded-sm", dark ? "bg-[#121826]" : "bg-white")} />
    </span>
  )
  return (
    <span aria-hidden className="flex h-14 overflow-hidden rounded-lg border">
      {mode === "dark" ? pane(true) : pane(false)}
      {mode === "system" ? pane(true) : null}
    </span>
  )
}

function DensityPreview({ density }: { density: Density }) {
  const rows = density === "compact" ? 4 : 3
  return (
    <span aria-hidden className="flex h-14 flex-col justify-center gap-1 rounded-lg border bg-muted/40 px-2">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={cn("rounded-sm bg-border", density === "compact" ? "h-1.5" : "h-2.5")} />
      ))}
    </span>
  )
}

const fontPreviewSize: Record<FontScale, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
}

export function AppearancePage() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [preferences, setPreferences] = useState(readPreferences)

  function update(next: Partial<UserPreferences>) {
    const merged = { ...preferences, ...next }
    setPreferences(merged)
    savePreferences(merged)
  }

  const modes: ThemeMode[] = ["light", "dark", "system"]
  const densities: Density[] = ["compact", "comfortable"]
  const scales: FontScale[] = ["sm", "md", "lg"]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-2 p-4 md:p-6">
      <PageHeader
        title={t("profile.appearance.title")}
        description={t("profile.appearance.description")}
      />
      <div className="rounded-2xl border bg-card px-5">
        <ChoiceGroup
          title={t("profile.appearance.mode.title")}
          description={t("profile.appearance.mode.description")}
          value={theme}
          onChange={setTheme}
          choices={modes.map((mode) => ({
            value: mode,
            label: t(`profile.appearance.mode.${mode}`),
            preview: <ModePreview mode={mode} />,
          }))}
        />
        <ChoiceGroup
          title={t("profile.appearance.density.title")}
          description={t("profile.appearance.density.description")}
          value={preferences.density}
          onChange={(density) => update({ density })}
          columns={2}
          choices={densities.map((density) => ({
            value: density,
            label: t(`profile.appearance.density.${density}`),
            description: t(`profile.appearance.density.${density}_hint`),
            preview: <DensityPreview density={density} />,
          }))}
        />
        <ChoiceGroup
          title={t("profile.appearance.font_scale.title")}
          description={t("profile.appearance.font_scale.description")}
          value={preferences.fontScale}
          onChange={(fontScale) => update({ fontScale })}
          choices={scales.map((scale) => ({
            value: scale,
            label: t(`profile.appearance.font_scale.${scale}`),
            preview: (
              <span aria-hidden className={cn("flex h-14 items-center justify-center rounded-lg border bg-muted/40 font-semibold", fontPreviewSize[scale])}>
                Aa
              </span>
            ),
          }))}
        />
      </div>
      <p className="flex items-start gap-2 px-1 pt-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("profile.appearance.org_note")}
      </p>
    </div>
  )
}
