import * as React from "react"
import { Check, Copy } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Document identity chip (design board 02): the code every voucher, contract
 * and case is known by, in mono, copyable. `pending` marks a draft whose code
 * is only issued on submit.
 */
export function DocCode({
  code,
  pending = false,
  className,
}: {
  code?: string
  pending?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const [copied, setCopied] = React.useState(false)

  if (pending || !code) {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center rounded-md border border-dashed px-2 font-mono text-xs text-muted-foreground",
          className
        )}
      >
        {t("common.doc_code.pending")}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      title={copied ? t("common.action.copied") : t("common.action.copy")}
      aria-label={`${code} · ${t("common.action.copy")}`}
      className={cn(
        "group/code inline-flex h-6 items-center gap-1.5 rounded-md border bg-background px-2 font-mono text-xs font-medium transition-colors hover:border-ring/60",
        className
      )}
    >
      {code}
      {copied ? (
        <Check aria-hidden className="size-3 text-success" />
      ) : (
        <Copy
          aria-hidden
          className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/code:opacity-100 group-focus-visible/code:opacity-100"
        />
      )}
    </button>
  )
}
