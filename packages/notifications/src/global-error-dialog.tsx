import { useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useErrorDialogStore } from "./error-dialog-store"

// 1 instance mount ở shell. showErrorDialog() mở imperatively.
// Hiển thị message đã translate + trace_id (request_id từ BE) copyable
// cho dev debug. Validation errors (có fields) KHÔNG nên vào đây —
// callers đó dùng form.setError + notify.warning.

// duck-type ApiClientError (core) — đọc trace, không import để tránh cycle.
type ApiClientErrorLike = {
  code?: string
  status?: number
  requestId?: string
  fields?: Record<string, string>
}

function readTraceId(error: unknown): string | undefined {
  if (error && typeof error === "object" && "requestId" in error) {
    const v = (error as ApiClientErrorLike).requestId
    return typeof v === "string" && v ? v : undefined
  }
  return undefined
}

export function GlobalErrorDialog() {
  const { t } = useI18n()
  const { open, error, title, retry, dismiss } = useErrorDialogStore()
  const [copied, setCopied] = useState(false)

  const message = translateApiError(error)
  const traceId = readTraceId(error)

  const copyTrace = async () => {
    if (!traceId) return
    try {
      await navigator.clipboard.writeText(traceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — trace vẫn hiện để dev đọc tay
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t("common.error.page_load_title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span>{message}</span>
              {traceId ? (
                <div className="flex items-center gap-2 rounded border bg-muted px-2 py-1 text-xs">
                  <span className="font-mono">{t("common.error.trace_id")}: {traceId}</span>
                  <button
                    type="button"
                    onClick={copyTrace}
                    className="text-xs underline"
                  >
                    {copied ? t("common.action.copied") : t("common.action.copy")}
                  </button>
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>
            {t("common.action.close")}
          </AlertDialogCancel>
          {retry ? (
            <AlertDialogAction onClick={() => retry()}>
              {t("common.action.retry")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}