import { Fragment, useState, type ReactNode } from "react"
import { AlertTriangle, BookOpen, Check, Copy, Sparkles } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  requestErrorAskAi,
  useErrorAskAiEnabled,
} from "./error-dialog-ask-ai"

// Shared building blocks for the app's error dialogs (global shell dialog +
// per-page list dialog). Keeping the shape in one place means the problem
// link, trace id and "Ask AI" affordances stay identical everywhere.
//
// Error objects are duck-typed (ApiClientError) on purpose — this package
// must not depend on @workspace/api.

export type ErrorDialogDetails = {
  message: string
  code?: string
  status?: number
  /** Canonical Problem.request_id, copyable for technical support. */
  traceId?: string
  /** Stable problem docs URL (Problem.type) or one derived from the code. */
  docsUrl?: string
  /** Route the user was on when the error happened. */
  screen?: string
}

type ApiErrorLike = {
  code?: unknown
  status?: unknown
  requestId?: unknown
  problemType?: unknown
}

const DOCS_PROBLEMS_BASE = "https://docs.arda.io.vn/problems/"

export function readErrorDetails(
  error: unknown,
  message: string
): ErrorDialogDetails {
  const typed =
    error && typeof error === "object" ? (error as ApiErrorLike) : undefined

  const code =
    typeof typed?.code === "string" && typed.code ? typed.code : undefined
  const status = typeof typed?.status === "number" ? typed.status : undefined
  const traceId =
    typeof typed?.requestId === "string" && typed.requestId
      ? typed.requestId
      : undefined

  let docsUrl: string | undefined
  if (
    typeof typed?.problemType === "string" &&
    typed.problemType.startsWith("http")
  ) {
    docsUrl = typed.problemType
  } else if (code) {
    docsUrl = `${DOCS_PROBLEMS_BASE}${code}`
  }

  const screen =
    typeof window !== "undefined" ? window.location.pathname : undefined

  return { message, code, status, traceId, docsUrl, screen }
}

/**
 * Build the user message handed to Olorin so the model gets the same facts a
 * support engineer would need. Built by concatenation (not ICU interpolation)
 * so no user text can be interpreted as a placeholder.
 */
export function buildErrorAiPrompt(
  details: ErrorDialogDetails,
  t: (key: string) => string
): string {
  const lines = [
    t("common.error.ask_ai_intro"),
    "",
    `- ${t("common.error.ask_ai_message")}: ${details.message}`,
  ]
  if (details.code) lines.push(`- ${t("common.error.code")}: ${details.code}`)
  if (details.status != null) {
    lines.push(`- ${t("common.error.http_status")}: ${details.status}`)
  }
  if (details.screen) {
    lines.push(`- ${t("common.error.screen")}: ${details.screen}`)
  }
  if (details.traceId) {
    lines.push(`- ${t("common.error.trace_id")}: ${details.traceId}`)
  }
  if (details.docsUrl) {
    lines.push(`- ${t("common.error.docs_link")}: ${details.docsUrl}`)
  }
  return lines.join("\n")
}

/** Panel listing code / HTTP status / screen / trace id and the docs link. */
export function ErrorDialogDetails({ details }: { details: ErrorDialogDetails }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const rows: Array<{ key: string; label: string; value: ReactNode }> = []
  if (details.code) {
    rows.push({
      key: "code",
      label: t("common.error.code"),
      value: (
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs ring-1 ring-border">
          {details.code}
        </code>
      ),
    })
  }
  if (details.status != null) {
    rows.push({
      key: "status",
      label: t("common.error.http_status"),
      value: <span className="font-mono text-xs">{details.status}</span>,
    })
  }
  if (details.screen) {
    rows.push({
      key: "screen",
      label: t("common.error.screen"),
      value: (
        <span className="truncate font-mono text-xs" title={details.screen}>
          {details.screen}
        </span>
      ),
    })
  }

  const hasContent = rows.length > 0 || Boolean(details.traceId) || Boolean(details.docsUrl)
  if (!hasContent) return null

  const copyTrace = async () => {
    if (!details.traceId) return
    try {
      await navigator.clipboard.writeText(details.traceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked — the trace id is still selectable in the dialog.
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {t("common.error.detail")}
      </p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-sm">
        {rows.map((row) => (
          <Fragment key={row.key}>
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="flex min-w-0 items-center">{row.value}</dd>
          </Fragment>
        ))}
        {details.traceId ? (
          <>
            <dt className="text-xs text-muted-foreground">
              {t("common.error.trace_id")}
            </dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs" title={details.traceId}>
                {details.traceId}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 shrink-0 gap-1 px-1.5 text-[11px]"
                onClick={copyTrace}
                aria-label={t("common.action.copy")}
                title={t("common.action.copy")}
              >
                {copied ? (
                  <Check className="size-3 text-success" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? t("common.action.copied") : t("common.action.copy")}
              </Button>
            </dd>
          </>
        ) : null}
      </dl>
      {details.docsUrl ? (
        <a
          href={details.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <BookOpen className="size-3.5" />
          {t("common.error.docs_link")}
        </a>
      ) : null}
    </div>
  )
}

/**
 * "Ask AI" action — only rendered once the shell advertises AI availability.
 * `onAsked` lets the host dialog close itself so the modal does not trap focus
 * away from the Olorin panel that is about to open.
 */
export function ErrorDialogAskAiButton({
  prompt,
  onAsked,
}: {
  prompt: string
  onAsked?: () => void
}) {
  const { t } = useI18n()
  const enabled = useErrorAskAiEnabled()
  if (!enabled || !prompt.trim()) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        requestErrorAskAi(prompt)
        onAsked?.()
      }}
    >
      <Sparkles className="size-3.5" />
      {t("common.error.ask_ai")}
    </Button>
  )
}

/** Destructive header icon used by both dialogs. */
export function ErrorDialogIcon() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertTriangle className="size-5" aria-hidden />
    </span>
  )
}
