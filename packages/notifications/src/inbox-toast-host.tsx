import { useEffect } from "react"
import { Bell, CheckCircle2, CircleAlert, Info, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { notificationsApi } from "./api"
import { useInboxToastStore, type InboxToast } from "./inbox-toast-store"
import { useNotificationsStore } from "./store"
import type { NotificationKind } from "./types"

const AUTO_DISMISS_MS = 5_500

const accentByType: Record<NotificationKind, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
}

const iconByType: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: CircleAlert,
  error: CircleAlert,
}

export function InboxToastHost() {
  const toasts = useInboxToastStore((state) => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:w-[min(100%,22rem)]"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <InboxToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function InboxToastCard({ toast }: { toast: InboxToast }) {
  const dismiss = useInboxToastStore((state) => state.dismiss)
  const markRead = useNotificationsStore((state) => state.markRead)
  const Icon = iconByType[toast.type] ?? Bell

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [dismiss, toast.id])

  const open = () => {
    markRead(toast.notificationId)
    notificationsApi.markRead(toast.notificationId).catch(() => {})
    dismiss(toast.id)
    if (toast.href) {
      window.location.assign(toast.href)
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full overflow-hidden rounded-lg border bg-background shadow-md",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
      )}
      role="status"
    >
      <span className={cn("w-1 shrink-0", accentByType[toast.type])} />
      <button
        type="button"
        className="flex min-w-0 flex-1 gap-3 px-3 py-3 text-left"
        onClick={open}
      >
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            toast.type === "success" && "text-emerald-600",
            toast.type === "warning" && "text-amber-600",
            toast.type === "error" && "text-rose-600",
            toast.type === "info" && "text-sky-600"
          )}
        />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate text-sm font-medium leading-snug">
            {toast.title}
          </span>
          {toast.body ? (
            <span className="line-clamp-2 block text-xs text-muted-foreground">
              {toast.body}
            </span>
          ) : null}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="m-1 size-7 shrink-0"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
