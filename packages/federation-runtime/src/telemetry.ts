export type BrowserErrorKind =
  | "remote-module"
  | "browser-runtime"
  | "unhandled-rejection"

export type BrowserErrorReport = {
  kind: BrowserErrorKind
  name: string
  message: string
  route?: string
}

type BrowserTelemetryListener = (report: BrowserErrorReport) => void

const emailPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi
const bearerPattern = /\bBearer\s+[^\s]+/gi
const tokenPattern = /\b(?:token|secret|password)=[^&\s]+/gi

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(emailPattern, "[redacted-email]")
    .replace(uuidPattern, "[redacted-id]")
    .replace(bearerPattern, "Bearer [redacted]")
    .replace(tokenPattern, (match) => `${match.split("=", 1)[0]}=[redacted]`)
    .slice(0, 240)
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: safeText(error.name || "Error"), message: safeText(error.message) }
  }
  return { name: "UnknownError", message: safeText(error) }
}

let listener: BrowserTelemetryListener | null = null

export function setBrowserTelemetryListener(next: BrowserTelemetryListener | null) {
  listener = next
}

export function reportBrowserError(input: {
  kind: BrowserErrorKind
  error: unknown
  route?: string
}) {
  const normalized = normalizeError(input.error)
  const report: BrowserErrorReport = {
    kind: input.kind,
    ...normalized,
    route: input.route ? safeText(input.route) : undefined,
  }

  listener?.(report)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("arda:browser-error", { detail: report }))
  }
}

export function installGlobalBrowserErrorHandlers() {
  if (typeof window === "undefined") return () => {}

  const onError = (event: ErrorEvent) => {
    reportBrowserError({
      kind: "browser-runtime",
      error: event.error ?? event.message,
      route: window.location.pathname,
    })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    reportBrowserError({
      kind: "unhandled-rejection",
      error: event.reason,
      route: window.location.pathname,
    })
  }

  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  return () => {
    window.removeEventListener("error", onError)
    window.removeEventListener("unhandledrejection", onRejection)
  }
}
