import { applyOrgTheme, readCachedOrgTheme } from "./brand"

// Personal display preferences (design board 08, "Của bạn"). Colours, fonts
// and radii are no longer per user: the organisation theme (brand.ts) and the
// design tokens in globals.css own them.
export const PREFERENCES_STORAGE_KEY = "arda-preferences"

/** Keys of the retired per-user theme studio, cleared once on read. */
const RETIRED_KEYS = [
  "arda-appearance",
  "arda-appearance-v2",
  "arda-appearance-custom-presets",
]

export type Density = "compact" | "comfortable"
export type FontScale = "sm" | "md" | "lg"

export type UserPreferences = {
  density: Density
  fontScale: FontScale
}

export const densities: Density[] = ["compact", "comfortable"]
export const fontScales: FontScale[] = ["sm", "md", "lg"]

export const defaultPreferences: UserPreferences = {
  density: "compact",
  fontScale: "md",
}

export function normalizePreferences(value: unknown): UserPreferences {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<
    Record<keyof UserPreferences, unknown>
  >
  return {
    density: densities.includes(raw.density as Density)
      ? (raw.density as Density)
      : defaultPreferences.density,
    fontScale: fontScales.includes(raw.fontScale as FontScale)
      ? (raw.fontScale as FontScale)
      : defaultPreferences.fontScale,
  }
}

export function readPreferences(): UserPreferences {
  if (typeof localStorage === "undefined") return defaultPreferences
  try {
    for (const key of RETIRED_KEYS) localStorage.removeItem(key)
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    return raw ? normalizePreferences(JSON.parse(raw)) : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

export function savePreferences(preferences: UserPreferences) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Storage can be unavailable; the choice still applies to this page.
  }
  applyPreferences(preferences)
}

/** Drives the [data-density] / [data-font-scale] rules in globals.css. */
export function applyPreferences(preferences: UserPreferences) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.density = preferences.density
  root.dataset.fontScale = preferences.fontScale
}

/** Re-applies everything stored locally; called on load and theme change. */
export function applyStoredAppearance() {
  applyPreferences(readPreferences())
  applyOrgTheme(readCachedOrgTheme())
}
