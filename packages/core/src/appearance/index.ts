export const APPEARANCE_STORAGE_KEY = "arda-appearance"

export type BaseColor = "neutral" | "zinc" | "slate" | "blue" | "green" | "orange" | "red" | "violet"
export type ChartPalette = "default" | "finance" | "cool" | "warm"
export type FontPreset = "inter" | "system" | "serif" | "mono"
export type RadiusPreset = "none" | "sm" | "md" | "lg" | "xl"

export type AppearanceSettings = {
  baseColor: BaseColor
  chartPalette: ChartPalette
  font: FontPreset
  headingFont: FontPreset
  radius: RadiusPreset
}

type BaseColorDefinition = {
  label: string
  swatch: string
  light: Record<string, string>
  dark: Record<string, string>
}

type ChartPaletteDefinition = {
  label: string
  colors: [string, string, string, string, string]
}

type FontDefinition = {
  label: string
  stack: string
}

export const defaultAppearance: AppearanceSettings = {
  baseColor: "neutral",
  chartPalette: "default",
  font: "inter",
  headingFont: "inter",
  radius: "md",
}

export const baseColors: Record<BaseColor, BaseColorDefinition> = {
  neutral: {
    label: "Neutral",
    swatch: "oklch(0.205 0 0)",
    light: {
      "--primary": "oklch(0.205 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.708 0 0)",
      "--sidebar-primary": "oklch(0.205 0 0)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    },
    dark: {
      "--primary": "oklch(0.922 0 0)",
      "--primary-foreground": "oklch(0.205 0 0)",
      "--ring": "oklch(0.556 0 0)",
      "--sidebar-primary": "oklch(0.922 0 0)",
      "--sidebar-primary-foreground": "oklch(0.205 0 0)",
    },
  },
  zinc: {
    label: "Zinc",
    swatch: "oklch(0.21 0.006 285.885)",
    light: {
      "--primary": "oklch(0.21 0.006 285.885)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.705 0.015 286.067)",
      "--sidebar-primary": "oklch(0.21 0.006 285.885)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    },
    dark: {
      "--primary": "oklch(0.92 0.004 286.32)",
      "--primary-foreground": "oklch(0.21 0.006 285.885)",
      "--ring": "oklch(0.552 0.016 285.938)",
      "--sidebar-primary": "oklch(0.92 0.004 286.32)",
      "--sidebar-primary-foreground": "oklch(0.21 0.006 285.885)",
    },
  },
  slate: {
    label: "Slate",
    swatch: "oklch(0.208 0.042 265.755)",
    light: {
      "--primary": "oklch(0.208 0.042 265.755)",
      "--primary-foreground": "oklch(0.984 0.003 247.858)",
      "--ring": "oklch(0.704 0.04 256.788)",
      "--sidebar-primary": "oklch(0.208 0.042 265.755)",
      "--sidebar-primary-foreground": "oklch(0.984 0.003 247.858)",
    },
    dark: {
      "--primary": "oklch(0.929 0.013 255.508)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.554 0.046 257.417)",
      "--sidebar-primary": "oklch(0.929 0.013 255.508)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
  blue: {
    label: "Blue",
    swatch: "oklch(0.623 0.214 259.815)",
    light: {
      "--primary": "oklch(0.623 0.214 259.815)",
      "--primary-foreground": "oklch(0.97 0.014 254.604)",
      "--ring": "oklch(0.623 0.214 259.815)",
      "--sidebar-primary": "oklch(0.623 0.214 259.815)",
      "--sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
    },
    dark: {
      "--primary": "oklch(0.707 0.165 254.624)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.707 0.165 254.624)",
      "--sidebar-primary": "oklch(0.707 0.165 254.624)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
  green: {
    label: "Green",
    swatch: "oklch(0.627 0.194 149.214)",
    light: {
      "--primary": "oklch(0.627 0.194 149.214)",
      "--primary-foreground": "oklch(0.982 0.018 155.826)",
      "--ring": "oklch(0.627 0.194 149.214)",
      "--sidebar-primary": "oklch(0.627 0.194 149.214)",
      "--sidebar-primary-foreground": "oklch(0.982 0.018 155.826)",
    },
    dark: {
      "--primary": "oklch(0.723 0.219 149.579)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.723 0.219 149.579)",
      "--sidebar-primary": "oklch(0.723 0.219 149.579)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
  orange: {
    label: "Orange",
    swatch: "oklch(0.705 0.213 47.604)",
    light: {
      "--primary": "oklch(0.705 0.213 47.604)",
      "--primary-foreground": "oklch(0.98 0.016 73.684)",
      "--ring": "oklch(0.705 0.213 47.604)",
      "--sidebar-primary": "oklch(0.705 0.213 47.604)",
      "--sidebar-primary-foreground": "oklch(0.98 0.016 73.684)",
    },
    dark: {
      "--primary": "oklch(0.75 0.183 55.934)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.75 0.183 55.934)",
      "--sidebar-primary": "oklch(0.75 0.183 55.934)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
  red: {
    label: "Red",
    swatch: "oklch(0.577 0.245 27.325)",
    light: {
      "--primary": "oklch(0.577 0.245 27.325)",
      "--primary-foreground": "oklch(0.971 0.013 17.38)",
      "--ring": "oklch(0.577 0.245 27.325)",
      "--sidebar-primary": "oklch(0.577 0.245 27.325)",
      "--sidebar-primary-foreground": "oklch(0.971 0.013 17.38)",
    },
    dark: {
      "--primary": "oklch(0.704 0.191 22.216)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.704 0.191 22.216)",
      "--sidebar-primary": "oklch(0.704 0.191 22.216)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
  violet: {
    label: "Violet",
    swatch: "oklch(0.606 0.25 292.717)",
    light: {
      "--primary": "oklch(0.606 0.25 292.717)",
      "--primary-foreground": "oklch(0.969 0.016 293.756)",
      "--ring": "oklch(0.606 0.25 292.717)",
      "--sidebar-primary": "oklch(0.606 0.25 292.717)",
      "--sidebar-primary-foreground": "oklch(0.969 0.016 293.756)",
    },
    dark: {
      "--primary": "oklch(0.702 0.183 293.541)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--ring": "oklch(0.702 0.183 293.541)",
      "--sidebar-primary": "oklch(0.702 0.183 293.541)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
    },
  },
}

export const chartPalettes: Record<ChartPalette, ChartPaletteDefinition> = {
  default: {
    label: "Default",
    colors: [
      "oklch(0.87 0 0)",
      "oklch(0.556 0 0)",
      "oklch(0.439 0 0)",
      "oklch(0.371 0 0)",
      "oklch(0.269 0 0)",
    ],
  },
  finance: {
    label: "Finance",
    colors: [
      "oklch(0.62 0.18 145)",
      "oklch(0.58 0.16 250)",
      "oklch(0.68 0.18 70)",
      "oklch(0.58 0.18 25)",
      "oklch(0.52 0.12 290)",
    ],
  },
  cool: {
    label: "Cool",
    colors: [
      "oklch(0.62 0.19 255)",
      "oklch(0.67 0.17 190)",
      "oklch(0.58 0.18 285)",
      "oklch(0.72 0.13 220)",
      "oklch(0.55 0.12 175)",
    ],
  },
  warm: {
    label: "Warm",
    colors: [
      "oklch(0.68 0.2 45)",
      "oklch(0.62 0.21 25)",
      "oklch(0.72 0.17 80)",
      "oklch(0.6 0.18 350)",
      "oklch(0.55 0.12 20)",
    ],
  },
}

export const fontPresets: Record<FontPreset, FontDefinition> = {
  inter: { label: "Inter", stack: "'Inter Variable', sans-serif" },
  system: { label: "System", stack: "ui-sans-serif, system-ui, sans-serif" },
  serif: { label: "Serif", stack: "ui-serif, Georgia, Cambria, serif" },
  mono: { label: "Mono", stack: "ui-monospace, SFMono-Regular, Menlo, monospace" },
}

export const radiusPresets: Record<RadiusPreset, { label: string; value: string }> = {
  none: { label: "None", value: "0rem" },
  sm: { label: "Small", value: "0.375rem" },
  md: { label: "Medium", value: "0.625rem" },
  lg: { label: "Large", value: "0.875rem" },
  xl: { label: "Extra", value: "1.125rem" },
}

export function readAppearance(): AppearanceSettings {
  if (typeof localStorage === "undefined") return defaultAppearance
  try {
    const parsed = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "{}")
    return normalizeAppearance(parsed)
  } catch {
    return defaultAppearance
  }
}

export function saveAppearance(settings: AppearanceSettings) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings))
  applyAppearance(settings)
}

export function resetAppearance() {
  localStorage.removeItem(APPEARANCE_STORAGE_KEY)
  applyAppearance(defaultAppearance)
}

export function applyStoredAppearance() {
  applyAppearance(readAppearance())
}

export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const isDark = root.classList.contains("dark")
  const base = baseColors[settings.baseColor] ?? baseColors[defaultAppearance.baseColor]
  const baseVars = isDark ? base.dark : base.light
  for (const [name, value] of Object.entries(baseVars)) {
    root.style.setProperty(name, value)
  }
  const charts = chartPalettes[settings.chartPalette] ?? chartPalettes[defaultAppearance.chartPalette]
  charts.colors.forEach((color, index) => {
    root.style.setProperty(`--chart-${index + 1}`, color)
  })
  root.style.setProperty("--radius", radiusPresets[settings.radius]?.value ?? radiusPresets.md.value)
  root.style.setProperty("--font-sans", fontPresets[settings.font]?.stack ?? fontPresets.inter.stack)
  root.style.setProperty(
    "--font-heading",
    fontPresets[settings.headingFont]?.stack ?? fontPresets.inter.stack
  )
}

export function getAppearanceScript() {
  const key = JSON.stringify(APPEARANCE_STORAGE_KEY)
  const fallback = JSON.stringify(defaultAppearance)
  const bases = JSON.stringify(baseColors)
  const charts = JSON.stringify(chartPalettes)
  const radii = JSON.stringify(radiusPresets)
  const fonts = JSON.stringify(fontPresets)

  return `(function(){try{var key=${key};var settings=JSON.parse(localStorage.getItem(key)||'null')||${fallback};var bases=${bases};var charts=${charts};var radii=${radii};var fonts=${fonts};var root=document.documentElement;var base=bases[settings.baseColor]||bases.neutral;var vars=root.classList.contains('dark')?base.dark:base.light;for(var name in vars){root.style.setProperty(name,vars[name])}var chart=charts[settings.chartPalette]||charts.default;for(var i=0;i<chart.colors.length;i++){root.style.setProperty('--chart-'+(i+1),chart.colors[i])}root.style.setProperty('--radius',(radii[settings.radius]||radii.md).value);root.style.setProperty('--font-sans',(fonts[settings.font]||fonts.inter).stack);root.style.setProperty('--font-heading',(fonts[settings.headingFont]||fonts.inter).stack)}catch(e){}})();`
}

function normalizeAppearance(value: Partial<AppearanceSettings>): AppearanceSettings {
  return {
    baseColor: isKey(baseColors, value.baseColor) ? value.baseColor : defaultAppearance.baseColor,
    chartPalette: isKey(chartPalettes, value.chartPalette)
      ? value.chartPalette
      : defaultAppearance.chartPalette,
    font: isKey(fontPresets, value.font) ? value.font : defaultAppearance.font,
    headingFont: isKey(fontPresets, value.headingFont)
      ? value.headingFont
      : defaultAppearance.headingFont,
    radius: isKey(radiusPresets, value.radius) ? value.radius : defaultAppearance.radius,
  }
}

function isKey<T extends Record<string, unknown>>(record: T, key: unknown): key is keyof T {
  return typeof key === "string" && key in record
}
