// Chart colours come from the design-system tokens in @workspace/ui
// (`--chart-1..10`, `--card`, ...) so Olorin charts follow the shell theme,
// including dark mode. The reader is injected so the helper stays testable
// without a DOM; see `readChartThemeFromDocument` for the browser wiring.

export type ChartTheme = {
  palette: string[]
  background: string
  card: string
  border: string
  mutedForeground: string
  foreground: string
  primary: string
  primaryForeground: string
}

export const CHART_TOKEN_COUNT = 10

// Previous hardcoded palette, kept as a per-slot fallback for browsers or
// contexts (tests, SSR) where the CSS variables cannot be resolved.
export const CHART_FALLBACK_PALETTE: readonly string[] = [
  "#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#64748b", "#a855f7",
]

export type CssVarReader = (name: string) => string

function pick(read: CssVarReader, name: string, fallback: string): string {
  const value = read(name)
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed || fallback
}

export function readChartTheme(read: CssVarReader): ChartTheme {
  const palette = CHART_FALLBACK_PALETTE.map((fallback, index) =>
    pick(read, `--chart-${index + 1}`, fallback)
  )
  return {
    palette,
    background: pick(read, "--background", "#ffffff"),
    card: pick(read, "--card", "#ffffff"),
    border: pick(read, "--border", "#e2e8f0"),
    mutedForeground: pick(read, "--muted-foreground", "#64748b"),
    foreground: pick(read, "--foreground", "#0f172a"),
    primary: pick(read, "--primary", "#2563eb"),
    primaryForeground: pick(read, "--primary-foreground", "#ffffff"),
  }
}

export function readChartThemeFromDocument(): ChartTheme {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") {
    return readChartTheme(() => "")
  }
  const style = getComputedStyle(document.documentElement)
  return readChartTheme((name) => style.getPropertyValue(name))
}

// The shell ThemeProvider toggles `.dark` on <html>; observe that attribute
// so an open chart re-colours without a remount.
export function observeThemeChange(onChange: () => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {}
  }
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}
