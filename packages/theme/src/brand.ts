// Organisation theme: one brand colour and one chart palette, set by system
// administrators in "Cài đặt hệ thống" and applied for every user (design
// board 08). Users cannot change these; their own choices live in
// appearance.ts.

export const ORG_THEME_CACHE_KEY = "arda-org-theme"

export const DEFAULT_BRAND_COLOR = "#2459e8"

/** Presets offered to admins. All keep white text at >= 4.5:1. */
export const BRAND_PRESETS = [
  { id: "arda", color: "#2459e8" },
  { id: "teal", color: "#0b7f7a" },
  { id: "green", color: "#15803d" },
  { id: "violet", color: "#7c3aed" },
  { id: "earth", color: "#c2410c" },
] as const

/** WCAG AA for normal text: brand fills carry white labels (buttons). */
export const MIN_BRAND_CONTRAST = 4.5

export type ChartPalette = "default" | "finance" | "cool" | "warm"

/** "default" keeps the 10-colour palette defined in globals.css. */
export const chartPalettes: Record<ChartPalette, string[]> = {
  default: [],
  finance: ["#15803d", "#2459e8", "#f59e0b", "#c93036", "#64748b"],
  cool: ["#2459e8", "#0ea5a4", "#7c3aed", "#0284c7", "#14b8a6"],
  warm: ["#f59e0b", "#e5484d", "#c2410c", "#db2777", "#a16207"],
}

export type OrgTheme = {
  brandColor: string
  chartPalette: ChartPalette
}

export const defaultOrgTheme: OrgTheme = {
  brandColor: DEFAULT_BRAND_COLOR,
  chartPalette: "default",
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value)
}

function relativeLuminance(hex: string) {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** Contrast ratio of white text on `hex` (1..21). */
export function contrastWithWhite(hex: string) {
  return 1.05 / (relativeLuminance(hex) + 0.05)
}

export function isUsableBrandColor(value: unknown): value is string {
  return isHexColor(value) && contrastWithWhite(value) >= MIN_BRAND_CONTRAST
}

export function normalizeOrgTheme(value: unknown): OrgTheme {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<
    Record<keyof OrgTheme, unknown>
  >
  return {
    brandColor: isUsableBrandColor(raw.brandColor)
      ? raw.brandColor.toLowerCase()
      : DEFAULT_BRAND_COLOR,
    chartPalette:
      typeof raw.chartPalette === "string" && raw.chartPalette in chartPalettes
        ? (raw.chartPalette as ChartPalette)
        : "default",
  }
}

const BRAND_VARS = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--accent",
  "--accent-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
] as const

/**
 * CSS variables for a custom brand colour. The default colour returns an
 * empty map: globals.css already holds its hand-tuned values.
 */
export function brandVars(
  hex: string,
  mode: "light" | "dark"
): Partial<Record<(typeof BRAND_VARS)[number], string>> {
  if (hex.toLowerCase() === DEFAULT_BRAND_COLOR) return {}
  if (mode === "dark") {
    const primary = `color-mix(in oklch, ${hex} 62%, white)`
    return {
      "--primary": primary,
      "--primary-foreground": "#0b0f19",
      "--ring": primary,
      "--accent": `color-mix(in oklch, ${hex} 24%, #121826)`,
      "--accent-foreground": `color-mix(in oklch, ${hex} 35%, white)`,
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": "#0b0f19",
    }
  }
  return {
    "--primary": hex,
    "--primary-foreground": "#ffffff",
    "--ring": hex,
    "--accent": `color-mix(in oklch, ${hex} 10%, white)`,
    "--accent-foreground": `color-mix(in oklch, ${hex} 78%, black)`,
    "--sidebar-primary": hex,
    "--sidebar-primary-foreground": "#ffffff",
  }
}

export function applyOrgTheme(theme: OrgTheme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const mode = root.classList.contains("dark") ? "dark" : "light"
  const vars = brandVars(theme.brandColor, mode)
  for (const name of BRAND_VARS) {
    const value = vars[name]
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
  const colors = chartPalettes[theme.chartPalette]
  for (let i = 1; i <= 5; i++) {
    const color = colors[i - 1]
    if (color) root.style.setProperty(`--chart-${i}`, color)
    else root.style.removeProperty(`--chart-${i}`)
  }
}

export function cacheOrgTheme(theme: OrgTheme) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(ORG_THEME_CACHE_KEY, JSON.stringify(theme))
  } catch {
    // Storage can be unavailable; the theme still applies in memory.
  }
}

export function readCachedOrgTheme(): OrgTheme {
  if (typeof localStorage === "undefined") return defaultOrgTheme
  try {
    const raw = localStorage.getItem(ORG_THEME_CACHE_KEY)
    return raw ? normalizeOrgTheme(JSON.parse(raw)) : defaultOrgTheme
  } catch {
    return defaultOrgTheme
  }
}
