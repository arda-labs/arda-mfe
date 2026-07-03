export const APPEARANCE_STORAGE_KEY = "arda-appearance"

export type BaseColor =
  | "arda"
  | "neutral"
  | "zinc"
  | "slate"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "violet"
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
  baseColor: "arda",
  chartPalette: "default",
  font: "inter",
  headingFont: "inter",
  radius: "md",
}

export const baseColors: Record<BaseColor, BaseColorDefinition> = {
  arda: {
    label: "Arda",
    swatch: "oklch(0.43 0.13 255)",
    light: {
      "--primary": "oklch(0.43 0.13 255)",
      "--primary-foreground": "oklch(0.99 0.003 247)",
      "--accent": "oklch(0.95 0.025 255)",
      "--accent-foreground": "oklch(0.26 0.08 255)",
      "--ring": "oklch(0.58 0.13 255)",
      "--sidebar-primary": "oklch(0.43 0.13 255)",
      "--sidebar-primary-foreground": "oklch(0.99 0.003 247)",
      "--sidebar-accent": "oklch(0.94 0.018 255)",
      "--sidebar-accent-foreground": "oklch(0.25 0.07 255)",
    },
    dark: {
      "--primary": "oklch(0.72 0.12 255)",
      "--primary-foreground": "oklch(0.16 0.012 255)",
      "--accent": "oklch(0.27 0.035 255)",
      "--accent-foreground": "oklch(0.9 0.03 255)",
      "--ring": "oklch(0.68 0.1 255)",
      "--sidebar-primary": "oklch(0.72 0.12 255)",
      "--sidebar-primary-foreground": "oklch(0.16 0.012 255)",
      "--sidebar-accent": "oklch(0.25 0.025 255)",
      "--sidebar-accent-foreground": "oklch(0.9 0.03 255)",
    },
  },
  neutral: {
    label: "Neutral",
    swatch: "oklch(0.205 0 0)",
    light: {
      "--primary": "oklch(0.205 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--accent": "oklch(0.97 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--ring": "oklch(0.708 0 0)",
      "--sidebar-primary": "oklch(0.205 0 0)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.97 0 0)",
      "--sidebar-accent-foreground": "oklch(0.205 0 0)",
    },
    dark: {
      "--primary": "oklch(0.922 0 0)",
      "--primary-foreground": "oklch(0.205 0 0)",
      "--accent": "oklch(0.269 0 0)",
      "--accent-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.556 0 0)",
      "--sidebar-primary": "oklch(0.922 0 0)",
      "--sidebar-primary-foreground": "oklch(0.205 0 0)",
      "--sidebar-accent": "oklch(0.269 0 0)",
      "--sidebar-accent-foreground": "oklch(0.985 0 0)",
    },
  },
  zinc: {
    label: "Zinc",
    swatch: "oklch(0.21 0.006 285.885)",
    light: {
      "--primary": "oklch(0.21 0.006 285.885)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--accent": "oklch(0.967 0.001 286.375)",
      "--accent-foreground": "oklch(0.21 0.006 285.885)",
      "--ring": "oklch(0.705 0.015 286.067)",
      "--sidebar-primary": "oklch(0.21 0.006 285.885)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.967 0.001 286.375)",
      "--sidebar-accent-foreground": "oklch(0.21 0.006 285.885)",
    },
    dark: {
      "--primary": "oklch(0.92 0.004 286.32)",
      "--primary-foreground": "oklch(0.21 0.006 285.885)",
      "--accent": "oklch(0.274 0.006 286.033)",
      "--accent-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.552 0.016 285.938)",
      "--sidebar-primary": "oklch(0.92 0.004 286.32)",
      "--sidebar-primary-foreground": "oklch(0.21 0.006 285.885)",
      "--sidebar-accent": "oklch(0.274 0.006 286.033)",
      "--sidebar-accent-foreground": "oklch(0.985 0 0)",
    },
  },
  slate: {
    label: "Slate",
    swatch: "oklch(0.208 0.042 265.755)",
    light: {
      "--primary": "oklch(0.208 0.042 265.755)",
      "--primary-foreground": "oklch(0.984 0.003 247.858)",
      "--accent": "oklch(0.96 0.018 255)",
      "--accent-foreground": "oklch(0.28 0.055 265.755)",
      "--ring": "oklch(0.704 0.04 256.788)",
      "--sidebar-primary": "oklch(0.208 0.042 265.755)",
      "--sidebar-primary-foreground": "oklch(0.984 0.003 247.858)",
      "--sidebar-accent": "oklch(0.94 0.02 256.788)",
      "--sidebar-accent-foreground": "oklch(0.28 0.055 265.755)",
    },
    dark: {
      "--primary": "oklch(0.929 0.013 255.508)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.28 0.035 256.788)",
      "--accent-foreground": "oklch(0.929 0.013 255.508)",
      "--ring": "oklch(0.554 0.046 257.417)",
      "--sidebar-primary": "oklch(0.929 0.013 255.508)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.28 0.035 256.788)",
      "--sidebar-accent-foreground": "oklch(0.929 0.013 255.508)",
    },
  },
  blue: {
    label: "Blue",
    swatch: "oklch(0.623 0.214 259.815)",
    light: {
      "--primary": "oklch(0.52 0.17 259.815)",
      "--primary-foreground": "oklch(0.97 0.014 254.604)",
      "--accent": "oklch(0.94 0.03 259.815)",
      "--accent-foreground": "oklch(0.32 0.12 259.815)",
      "--ring": "oklch(0.623 0.214 259.815)",
      "--sidebar-primary": "oklch(0.52 0.17 259.815)",
      "--sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "--sidebar-accent": "oklch(0.94 0.03 259.815)",
      "--sidebar-accent-foreground": "oklch(0.32 0.12 259.815)",
    },
    dark: {
      "--primary": "oklch(0.707 0.165 254.624)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.3 0.06 254.624)",
      "--accent-foreground": "oklch(0.9 0.04 254.624)",
      "--ring": "oklch(0.707 0.165 254.624)",
      "--sidebar-primary": "oklch(0.707 0.165 254.624)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.3 0.06 254.624)",
      "--sidebar-accent-foreground": "oklch(0.9 0.04 254.624)",
    },
  },
  green: {
    label: "Green",
    swatch: "oklch(0.627 0.194 149.214)",
    light: {
      "--primary": "oklch(0.47 0.14 149.214)",
      "--primary-foreground": "oklch(0.982 0.018 155.826)",
      "--accent": "oklch(0.94 0.035 149.214)",
      "--accent-foreground": "oklch(0.29 0.1 149.214)",
      "--ring": "oklch(0.627 0.194 149.214)",
      "--sidebar-primary": "oklch(0.47 0.14 149.214)",
      "--sidebar-primary-foreground": "oklch(0.982 0.018 155.826)",
      "--sidebar-accent": "oklch(0.94 0.035 149.214)",
      "--sidebar-accent-foreground": "oklch(0.29 0.1 149.214)",
    },
    dark: {
      "--primary": "oklch(0.723 0.219 149.579)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.28 0.06 149.579)",
      "--accent-foreground": "oklch(0.9 0.06 149.579)",
      "--ring": "oklch(0.723 0.219 149.579)",
      "--sidebar-primary": "oklch(0.723 0.219 149.579)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.28 0.06 149.579)",
      "--sidebar-accent-foreground": "oklch(0.9 0.06 149.579)",
    },
  },
  orange: {
    label: "Orange",
    swatch: "oklch(0.705 0.213 47.604)",
    light: {
      "--primary": "oklch(0.55 0.16 47.604)",
      "--primary-foreground": "oklch(0.98 0.016 73.684)",
      "--accent": "oklch(0.94 0.05 73.684)",
      "--accent-foreground": "oklch(0.34 0.11 47.604)",
      "--ring": "oklch(0.705 0.213 47.604)",
      "--sidebar-primary": "oklch(0.55 0.16 47.604)",
      "--sidebar-primary-foreground": "oklch(0.98 0.016 73.684)",
      "--sidebar-accent": "oklch(0.94 0.05 73.684)",
      "--sidebar-accent-foreground": "oklch(0.34 0.11 47.604)",
    },
    dark: {
      "--primary": "oklch(0.75 0.183 55.934)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.3 0.07 55.934)",
      "--accent-foreground": "oklch(0.92 0.07 55.934)",
      "--ring": "oklch(0.75 0.183 55.934)",
      "--sidebar-primary": "oklch(0.75 0.183 55.934)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.3 0.07 55.934)",
      "--sidebar-accent-foreground": "oklch(0.92 0.07 55.934)",
    },
  },
  red: {
    label: "Red",
    swatch: "oklch(0.577 0.245 27.325)",
    light: {
      "--primary": "oklch(0.52 0.19 27.325)",
      "--primary-foreground": "oklch(0.971 0.013 17.38)",
      "--accent": "oklch(0.94 0.035 17.38)",
      "--accent-foreground": "oklch(0.34 0.13 27.325)",
      "--ring": "oklch(0.577 0.245 27.325)",
      "--sidebar-primary": "oklch(0.52 0.19 27.325)",
      "--sidebar-primary-foreground": "oklch(0.971 0.013 17.38)",
      "--sidebar-accent": "oklch(0.94 0.035 17.38)",
      "--sidebar-accent-foreground": "oklch(0.34 0.13 27.325)",
    },
    dark: {
      "--primary": "oklch(0.704 0.191 22.216)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.3 0.07 22.216)",
      "--accent-foreground": "oklch(0.92 0.06 22.216)",
      "--ring": "oklch(0.704 0.191 22.216)",
      "--sidebar-primary": "oklch(0.704 0.191 22.216)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.3 0.07 22.216)",
      "--sidebar-accent-foreground": "oklch(0.92 0.06 22.216)",
    },
  },
  violet: {
    label: "Violet",
    swatch: "oklch(0.606 0.25 292.717)",
    light: {
      "--primary": "oklch(0.5 0.18 292.717)",
      "--primary-foreground": "oklch(0.969 0.016 293.756)",
      "--accent": "oklch(0.94 0.035 293.756)",
      "--accent-foreground": "oklch(0.33 0.13 292.717)",
      "--ring": "oklch(0.606 0.25 292.717)",
      "--sidebar-primary": "oklch(0.5 0.18 292.717)",
      "--sidebar-primary-foreground": "oklch(0.969 0.016 293.756)",
      "--sidebar-accent": "oklch(0.94 0.035 293.756)",
      "--sidebar-accent-foreground": "oklch(0.33 0.13 292.717)",
    },
    dark: {
      "--primary": "oklch(0.702 0.183 293.541)",
      "--primary-foreground": "oklch(0.208 0.042 265.755)",
      "--accent": "oklch(0.3 0.07 293.541)",
      "--accent-foreground": "oklch(0.92 0.06 293.541)",
      "--ring": "oklch(0.702 0.183 293.541)",
      "--sidebar-primary": "oklch(0.702 0.183 293.541)",
      "--sidebar-primary-foreground": "oklch(0.208 0.042 265.755)",
      "--sidebar-accent": "oklch(0.3 0.07 293.541)",
      "--sidebar-accent-foreground": "oklch(0.92 0.06 293.541)",
    },
  },
}

export const chartPalettes: Record<ChartPalette, ChartPaletteDefinition> = {
  default: {
    label: "Arda default",
    colors: [
      "oklch(0.58 0.13 255)",
      "oklch(0.55 0.13 150)",
      "oklch(0.7 0.14 75)",
      "oklch(0.58 0.12 25)",
      "oklch(0.55 0.08 300)",
    ],
  },
  finance: {
    label: "Finance",
    colors: [
      "oklch(0.55 0.13 150)",
      "oklch(0.58 0.13 255)",
      "oklch(0.7 0.14 75)",
      "oklch(0.58 0.2 25)",
      "oklch(0.48 0.025 255)",
    ],
  },
  cool: {
    label: "Cool",
    colors: [
      "oklch(0.58 0.13 255)",
      "oklch(0.64 0.12 205)",
      "oklch(0.57 0.12 280)",
      "oklch(0.68 0.1 230)",
      "oklch(0.58 0.1 175)",
    ],
  },
  warm: {
    label: "Warm",
    colors: [
      "oklch(0.7 0.14 75)",
      "oklch(0.58 0.12 25)",
      "oklch(0.72 0.12 95)",
      "oklch(0.58 0.13 350)",
      "oklch(0.5 0.09 20)",
    ],
  },
}

export const fontPresets: Record<FontPreset, FontDefinition> = {
  inter: {
    label: "Inter",
    stack: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
  },
  system: { label: "System", stack: "ui-sans-serif, system-ui, sans-serif" },
  serif: { label: "Serif", stack: "ui-serif, Georgia, Cambria, serif" },
  mono: {
    label: "Mono",
    stack: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
}

export const radiusPresets: Record<RadiusPreset, { label: string; value: string }> = {
  none: { label: "None", value: "0rem" },
  sm: { label: "Small", value: "0.375rem" },
  md: { label: "Medium", value: "0.5rem" },
  lg: { label: "Large", value: "0.75rem" },
  xl: { label: "Extra", value: "1rem" },
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
  const fontStack = fontPresets[settings.font]?.stack ?? fontPresets.inter.stack
  const headingStack = fontPresets[settings.headingFont]?.stack ?? fontPresets.inter.stack
  root.style.setProperty("--app-font-sans", fontStack)
  root.style.setProperty("--app-font-heading", headingStack)
  root.style.setProperty("--font-sans", fontStack)
  root.style.setProperty("--font-heading", headingStack)
}

export function getAppearanceScript() {
  const key = JSON.stringify(APPEARANCE_STORAGE_KEY)
  const fallback = JSON.stringify(defaultAppearance)
  const bases = JSON.stringify(baseColors)
  const charts = JSON.stringify(chartPalettes)
  const radii = JSON.stringify(radiusPresets)
  const fonts = JSON.stringify(fontPresets)

  return `(function(){try{var key=${key};var settings=JSON.parse(localStorage.getItem(key)||'null')||${fallback};var bases=${bases};var charts=${charts};var radii=${radii};var fonts=${fonts};var root=document.documentElement;var base=bases[settings.baseColor]||bases.arda;var vars=root.classList.contains('dark')?base.dark:base.light;for(var name in vars){root.style.setProperty(name,vars[name])}var chart=charts[settings.chartPalette]||charts.default;for(var i=0;i<chart.colors.length;i++){root.style.setProperty('--chart-'+(i+1),chart.colors[i])}root.style.setProperty('--radius',(radii[settings.radius]||radii.md).value);var fontStack=(fonts[settings.font]||fonts.inter).stack;var headingStack=(fonts[settings.headingFont]||fonts.inter).stack;root.style.setProperty('--app-font-sans',fontStack);root.style.setProperty('--app-font-heading',headingStack);root.style.setProperty('--font-sans',fontStack);root.style.setProperty('--font-heading',headingStack)}catch(e){}})();`
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
