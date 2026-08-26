import { useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Plus, Trash2, X } from "lucide-react"
import {
  deleteConversation,
  useOlorinConversations,
} from "../conversations"
import { useOlorinContext } from "../context"
import { OlorinProvider } from "../provider"
import { OlorinPanel } from "./olorin-panel"

export function OlorinWorkspace({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex bg-background text-foreground">
      <OlorinProvider>
        <OlorinWorkspaceSurface onExit={onExit} />
      </OlorinProvider>
    </div>
  )
}

function OlorinWorkspaceSurface({ onExit }: { onExit: () => void }) {
  const { t, formatDate } = useI18n()
  const { newThread, switchToThread, threadId } = useOlorinContext()
  const conversations = useOlorinConversations(true)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onExit()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onExit])

  return (
    <>
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-r bg-muted/20 md:flex">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b px-4">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {t("ai.name")}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("ai.panel.close")}
            onClick={onExit}
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-xs h-9 shadow-2xs"
            onClick={() => newThread()}
          >
            <Plus className="size-4" />
            <span>{t("ai.threads.new")}</span>
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("ai.threads.title")}
          </p>
          {conversations.conversations.length === 0 && !conversations.loading && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {t("ai.threads.empty")}
            </p>
          )}
          {conversations.conversations.map((conversation) => (
            <div
              key={conversation.threadId}
              role="button"
              tabIndex={0}
              onClick={() => switchToThread(conversation.threadId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  switchToThread(conversation.threadId)
                }
              }}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors text-xs",
                conversation.threadId === threadId
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/70 text-foreground"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block w-full truncate font-medium">
                  {conversation.title || conversation.threadId}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  {conversation.messageCount} {t("ai.threads.messages_suffix")}
                  {conversation.lastMessageAt &&
                    ` · ${formatDate(conversation.lastMessageAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}`}
                </span>
              </span>
              <button
                type="button"
                aria-label={t("ai.threads.delete")}
                className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation()
                  void deleteConversation(conversation.threadId)
                    .then(() => conversations.refresh())
                    .catch(() => undefined)
                }}
              >
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <p className="flex-1 truncate text-sm font-semibold">{t("ai.name")}</p>
          <Button variant="ghost" size="icon" onClick={onExit} className="size-8">
            <X className="size-4" />
          </Button>
        </div>
        <OlorinPanel className="min-h-0 flex-1" showHeader={false} />
      </main>
    </>
  )
}
