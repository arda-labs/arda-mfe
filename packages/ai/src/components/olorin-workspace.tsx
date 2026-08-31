import { useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
} from "@assistant-ui/react"
import { Minimize2, Plus, Trash2 } from "lucide-react"
import { useOlorinContext } from "../lib/context"
import { OlorinProvider } from "./provider"
import { OlorinPanel } from "./olorin-panel"

export type OlorinWorkspaceProps = {
  onMinimize?: () => void
  onExit?: () => void
}

export function OlorinWorkspace({ onMinimize, onExit }: OlorinWorkspaceProps) {
  return (
    <div className="fixed inset-0 z-[70] flex bg-background text-foreground">
      <OlorinProvider>
        <OlorinWorkspaceSurface onMinimize={onMinimize} onExit={onExit} />
      </OlorinProvider>
    </div>
  )
}

function OlorinWorkspaceSurface({
  onMinimize,
  onExit,
}: {
  onMinimize?: () => void
  onExit?: () => void
}) {
  const { t, formatDate } = useI18n()
  const { threadId, conversations } = useOlorinContext()
  const handleMinimize = onMinimize ?? onExit

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleMinimize?.()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleMinimize])

  return (
    <>
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-r bg-muted/20 md:flex">
        <div className="flex h-[52px] shrink-0 items-center border-b px-4">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {t("ai.name")}
          </p>
        </div>

        <div className="p-3">
          <ThreadListPrimitive.New asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-xs h-9 shadow-2xs"
            >
              <Plus className="size-4" />
              <span>{t("ai.threads.new")}</span>
            </Button>
          </ThreadListPrimitive.New>
        </div>

        <ThreadListPrimitive.Root className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("ai.threads.title")}
          </p>

          {conversations.list.length === 0 && !conversations.loading && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {t("ai.threads.empty")}
            </p>
          )}

          <ThreadListPrimitive.Items>
            {({ threadListItem }) => {
              const custom = threadListItem.custom as
                | { messageCount?: number; lastMessageAt?: string }
                | undefined
              return (
                <ThreadListItemPrimitive.Root
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors text-xs",
                    threadListItem.id === threadId
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-muted/70 text-foreground"
                  )}
                >
                  <ThreadListItemPrimitive.Trigger asChild>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block w-full truncate font-medium">
                        <ThreadListItemPrimitive.Title />
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {custom?.messageCount ?? 0} {t("ai.threads.messages_suffix")}
                        {custom?.lastMessageAt &&
                          ` · ${formatDate(custom.lastMessageAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}`}
                      </span>
                    </button>
                  </ThreadListItemPrimitive.Trigger>
                  <ThreadListItemPrimitive.Delete asChild>
                    <button
                      type="button"
                      aria-label={t("ai.threads.delete")}
                      className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </ThreadListItemPrimitive.Delete>
                </ThreadListItemPrimitive.Root>
              )
            }}
          </ThreadListPrimitive.Items>
        </ThreadListPrimitive.Root>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b px-4 bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-sm font-semibold">{t("ai.name")}</p>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · {t("ai.tagline")}
            </span>
          </div>
          {handleMinimize && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("ai.panel.minimize")}
              title={t("ai.panel.minimize")}
              onClick={handleMinimize}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="size-4" />
            </Button>
          )}
        </div>
        <OlorinPanel className="min-h-0 flex-1" showHeader={false} />
      </main>
    </>
  )
}