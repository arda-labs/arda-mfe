import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type RecordSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** Line above the title, usually <DocCode/>. */
  docCode?: React.ReactNode
  /** Status badge(s) next to the doc code. */
  badges?: React.ReactNode
  subtitle?: React.ReactNode
  /** Previous / next record in the list; omitted at the ends. */
  onPrev?: () => void
  onNext?: () => void
  /** "3 / 20" style position, shown next to the arrows. */
  position?: React.ReactNode
  /** Footer actions (approve / reject / open full page). */
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("input, textarea, select, [contenteditable=true], [role=combobox]")
  )
}

/**
 * Quick look at one record without leaving the list (design board 12.2).
 * Non-modal: the list stays usable, clicking another row switches the
 * record, ↑/↓ (or k/j) step through the rows, Esc closes.
 */
export function RecordSheet({
  open,
  onOpenChange,
  title,
  docCode,
  badges,
  subtitle,
  onPrev,
  onNext,
  position,
  actions,
  children,
  className,
}: RecordSheetProps) {
  const { t } = useI18n()

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (isTyping(event.target)) return
      if ((event.key === "ArrowDown" || event.key === "j") && onNext) {
        event.preventDefault()
        onNext()
      } else if ((event.key === "ArrowUp" || event.key === "k") && onPrev) {
        event.preventDefault()
        onPrev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onNext, onPrev])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-slot="record-sheet"
          // Clicking the list behind (another row) must not close the sheet.
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "fixed inset-y-2 right-2 z-40 flex w-[min(30rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-dialog outline-none",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-4",
            className
          )}
        >
          <header className="flex shrink-0 items-start gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              {docCode || badges ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {docCode}
                  {badges}
                </div>
              ) : null}
              <DialogPrimitive.Title className="truncate text-base leading-tight font-semibold">
                {title}
              </DialogPrimitive.Title>
              {subtitle ? (
                <DialogPrimitive.Description className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {t("common.record_sheet.hint")}
                </DialogPrimitive.Description>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {position ? (
                <span className="mr-1 text-xs text-muted-foreground tabular-nums">{position}</span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!onPrev}
                onClick={onPrev}
                title={`${t("common.record_sheet.previous")} (↑)`}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!onNext}
                onClick={onNext}
                title={`${t("common.record_sheet.next")} (↓)`}
              >
                <ChevronDown />
              </Button>
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`${t("common.action.close")} (Esc)`}
                >
                  <X />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {actions ? (
            <footer className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/40 px-4 py-3">
              {actions}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
