import { useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Trash2, X } from "lucide-react"
import {
  deleteConversation,
  fetchConversationMessages,
  useOlorinConversations,
} from "../conversations"
import { useOlorin } from "../use-olorin"
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
  const { newThread, switchToThread } = useOlorin()
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
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-r bg-muted/30 md:flex">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b px-3">
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
        <div className="p-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => newThread()}
          >
            {t("ai.threads.new")}
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
            {t("ai.threads.title")}
          </p>
          {conversations.conversations.length === 0 && !conversations.loading && (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {t("ai.threads.empty")}
            </p>
          )}
          {conversations.conversations.map((conversation) => (
            <div
              key={conversation.threadId}
              role="button"
              tabIndex={0}
              onClick={() => {
                void fetchConversationMessages(conversation.threadId)
                  .then((items) =>
                    switchToThread(
                      conversation.threadId,
                      items.map((item) => ({
                        id: `history-${item.sequence}`,
                        role: item.role,
                        content: item.content,
                      }))
                    )
                  )
                  .catch(() => undefined)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  void fetchConversationMessages(conversation.threadId)
                    .then((items) =>
                      switchToThread(
                        conversation.threadId,
                        items.map((item) => ({
                          id: `history-${item.sequence}`,
                          role: item.role,
                          content: item.content,
                        }))
                      )
                    )
                    .catch(() => undefined)
                }
              }}
              className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              <span className="min-w-0 flex-1">
                <span className="block w-full truncate text-sm font-medium">
                  {conversation.title || conversation.threadId}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {conversation.messageCount} {t("ai.threads.messages_suffix")}
                  {conversation.lastMessageAt &&
                    ` Â· ${formatDate(conversation.lastMessageAt, {
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
                <Trash2 className="size-3.5" />
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

