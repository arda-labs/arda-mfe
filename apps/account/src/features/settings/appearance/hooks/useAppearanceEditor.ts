import { useCallback, useEffect, useMemo, useState } from "react"
import {
  applyAppearance,
  builtinPresets,
  defaultAppearance,
  deleteCustomPreset,
  exportPresetsAsJson,
  importPresetsFromJson,
  readAppearance,
  readCustomPresets,
  resetAppearance,
  saveAppearance,
  saveCustomPreset,
} from "@workspace/theme/appearance"
import type {
  AppearancePreset,
  AppearanceSettings,
} from "@workspace/theme/appearance"
import { useTheme } from "@workspace/theme"

export function useAppearanceEditor() {
  const { theme, setTheme } = useTheme()
  const [applied, setApplied] = useState<AppearanceSettings>(() =>
    readAppearance()
  )
  const [draft, setDraft] = useState<AppearanceSettings>(() => applied)
  const [customPresets, setCustomPresets] = useState<AppearancePreset[]>(() =>
    readCustomPresets()
  )
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">(() => {
    if (theme === "dark") return "dark"
    if (theme === "light") return "light"
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })

  // Synchronize applied when mounting or if external change occurs
  useEffect(() => {
    applyAppearance(applied)
  }, [applied, theme])

  const isDirty = useMemo(() => {
    return (
      draft.baseColor !== applied.baseColor ||
      draft.chartPalette !== applied.chartPalette ||
      draft.font !== applied.font ||
      draft.headingFont !== applied.headingFont ||
      draft.radius !== applied.radius ||
      draft.headerSurface !== applied.headerSurface ||
      draft.sidebarSurface !== applied.sidebarSurface
    )
  }, [draft, applied])

  const updateDraft = useCallback(
    <TKey extends keyof AppearanceSettings>(
      key: TKey,
      value: AppearanceSettings[TKey]
    ) => {
      setDraft((prev) => ({ ...prev, [key]: value }))
      setSaveFeedback(null)
    },
    []
  )

  const applyDraft = useCallback(() => {
    saveAppearance(draft)
    setApplied(draft)
    setSaveFeedback("Appearance changes applied successfully.")
    window.setTimeout(() => setSaveFeedback(null), 3000)
  }, [draft])

  const discardDraft = useCallback(() => {
    setDraft(applied)
    setSaveFeedback(null)
  }, [applied])

  const resetToDefault = useCallback(() => {
    resetAppearance()
    setApplied(defaultAppearance)
    setDraft(defaultAppearance)
    setSaveFeedback("Reset to default appearance.")
    window.setTimeout(() => setSaveFeedback(null), 3000)
  }, [])

  const applyPreset = useCallback((preset: AppearancePreset) => {
    setDraft(preset.settings)
    if (preset.themeMode && preset.themeMode !== "system") {
      setPreviewTheme(preset.themeMode)
    }
    setSaveFeedback(null)
  }, [])

  const refreshPresets = useCallback(() => {
    setCustomPresets(readCustomPresets())
  }, [])

  const handleSaveAsPreset = useCallback(
    (name: string, description?: string) => {
      const created = saveCustomPreset({
        name,
        description,
        themeMode: theme,
        settings: draft,
      })
      refreshPresets()
      return created
    },
    [draft, theme, refreshPresets]
  )

  const handleDeletePreset = useCallback(
    (id: string) => {
      deleteCustomPreset(id)
      refreshPresets()
    },
    [refreshPresets]
  )

  const handleImportPresets = useCallback(
    (json: string) => {
      const result = importPresetsFromJson(json)
      if (result.success) {
        refreshPresets()
      }
      return result
    },
    [refreshPresets]
  )

  const handleExportPresets = useCallback(() => {
    return exportPresetsAsJson()
  }, [])

  return {
    theme,
    setTheme,
    previewTheme,
    setPreviewTheme,
    applied,
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
    saveAsPreset: handleSaveAsPreset,
    deletePreset: handleDeletePreset,
    importPresets: handleImportPresets,
    exportPresets: handleExportPresets,
  }
}
