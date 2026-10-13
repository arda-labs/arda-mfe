// Parent-side half of the widget protocol. The host runtime (widget-host.ts)
// only ever sends these two messages; anything else is dropped.
//
// The iframe runs model-generated JS, so any message it posts may be forged.
// Keep this parser strict: accept only the two typed shapes below and never
// coerce attacker-controlled values to strings (String(obj) can run a custom
// toString).
export const WIDGET_HEIGHT_MIN = 160
export const WIDGET_HEIGHT_MAX = 720
export const WIDGET_TIMEOUT_MS = 5000
export const WIDGET_MAX_MOUNTED = 3
const ERROR_MAX_CHARS = 500
const ERROR_FALLBACK_TEXT = "error"

export type WidgetInbound =
  | { type: "arda:height"; height: number }
  | { type: "arda:error"; message: string }

export function parseWidgetMessage(data: unknown): WidgetInbound | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null
  const msg = data as Record<string, unknown>
  if (msg.type === "arda:height") {
    const height = msg.height
    if (typeof height !== "number" || !Number.isFinite(height) || height < 0) return null
    return { type: "arda:height", height }
  }
  if (msg.type === "arda:error") {
    const raw = msg.message
    const message = typeof raw === "string" ? raw.slice(0, ERROR_MAX_CHARS) : ERROR_FALLBACK_TEXT
    return { type: "arda:error", message }
  }
  return null
}

export function clampWidgetHeight(height: number): number {
  return Math.min(WIDGET_HEIGHT_MAX, Math.max(WIDGET_HEIGHT_MIN, Math.round(height)))
}
