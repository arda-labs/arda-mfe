import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { notify } from "@workspace/ui/feedback/notify"
import { cn } from "@workspace/ui/lib/utils"
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  useAuiState,
} from "@assistant-ui/react"
import { LoaderCircle, Minimize2, Plus, Trash2 } from "lucide-react"
import { useOlorinContext } from "../lib/context"
import {
  deleteConversation,
  emptyConversationTrash,
  fetchDeletedConversations,
  permanentlyDeleteConversation,
  restoreConversation,
  type OlorinConversation,
} from "../lib/conversations"
import { OlorinPanel } from "./olorin-panel"
import { DeleteConversationDialog } from "./conversation-delete-dialog"
import { ConversationTrashDialog } from "./conversation-trash-dialog"

export type OlorinWorkspaceProps = {
  onMinimize?: () => void
  onExit?: () => void
}

// Full-screen workspace. Renders inside an existing OlorinProvider (the shell
// mounts a single provider for both panel and full-screen views so thread
// state survives minimize/expand) — no provider of its own.
export function OlorinWorkspace({ onMinimize, onExit }: OlorinWorkspaceProps) {
  return (
    <div className="fixed inset-0 z-[70] flex bg-background text-foreground">
      <OlorinWorkspaceSurface onMinimize={onMinimize} onExit={onExit} />
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
  const { threadId, newThread, conversations } = useOlorinContext()
  const isRunning = useAuiState((state) => state.thread.isRunning)
  const handleMinimize = onMinimize ?? onExit

  const [pendingDelete, setPendingDelete] = useState<{
    threadId: string
    title: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashError, setTrashError] = useState(false)
  const [trash, setTrash] = useState<OlorinConversation[]>([])
  const [trashBusyId, setTrashBusyId] = useState<string | null>(null)

  const loadTrash = useCallback(async () => {
    setTrashLoading(true)
    setTrashError(false)
    try {
      setTrash(await fetchDeletedConversations())
    } catch (error) {
      setTrash([])
      setTrashError(true)
      notify.error(t("ai.threads.trash_load_failed"), error)
    } finally {
      setTrashLoading(false)
    }
  }, [t])

  const openTrash = useCallback(() => {
    setTrashOpen(true)
    void loadTrash()
  }, [loadTrash])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const target = pendingDelete
    try {
      await deleteConversation(target.threadId)
      if (target.threadId === threadId) newThread()
      await conversations.refresh()
      setPendingDelete(null)
      if (trashOpen) await loadTrash()
    } catch (error) {
      // keep the dialog open for retry
      notify.error(t("ai.threads.delete_failed"), error)
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, threadId, newThread, conversations, trashOpen, loadTrash, t])

  const restore = useCallback(
    async (id: string) => {
      setTrashBusyId(id)
      try {
        await restoreConversation(id)
        await Promise.all([loadTrash(), conversations.refresh()])
      } catch (error) {
        notify.error(t("ai.threads.trash_action_failed"), error)
      } finally {
        setTrashBusyId(null)
      }
    },
    [loadTrash, conversations, t]
  )

  const permanentlyDelete = useCallback(
    async (id: string) => {
      setTrashBusyId(id)
      try {
        await permanentlyDeleteConversation(id)
        await loadTrash()
        await conversations.refresh()
      } catch (error) {
        notify.error(t("ai.threads.trash_action_failed"), error)
      } finally {
        setTrashBusyId(null)
      }
    },
    [loadTrash, conversations, t]
  )

  const emptyTrash = useCallback(async () => {
    setTrashBusyId("all")
    try {
      await emptyConversationTrash()
      await loadTrash()
      await conversations.refresh()
    } catch (error) {
      notify.error(t("ai.threads.trash_action_failed"), error)
    } finally {
      setTrashBusyId(null)
    }
  }, [loadTrash, conversations, t])

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
              className="h-9 w-full justify-start gap-2 text-xs shadow-2xs"
            >
              <Plus className="size-4" />
              <span>{t("ai.threads.new")}</span>
            </Button>
          </ThreadListPrimitive.New>
        </div>

        <ThreadListPrimitive.Root className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("ai.threads.title")}
          </p>

          {conversations.list.length === 0 && !conversations.loading && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {t("ai.threads.empty")}
            </p>
          )}

          {/* Current (unsaved) thread — always shown at the top so the user
              can see the conversation they are in, even before the first
              message persists it server-side. */}
          {(() => {
            const isCurrentPersisted = conversations.list.some(
              (c) => c.threadId === threadId
            )
            if (isCurrentPersisted) return null
            return (
              <div
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
                  "bg-accent font-medium text-accent-foreground"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block w-full truncate font-medium">
                    {t("ai.threads.current_new") || "Cuộc trò chuyện mới"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {isRunning ? (
                      <span className="shimmer text-primary motion-reduce:animate-none">
                        {t("ai.activity.working")}
                      </span>
                    ) : (
                      <>0 {t("ai.threads.messages_suffix")}</>
                    )}
                  </span>
                </span>
              </div>
            )
          })()}

          <ThreadListPrimitive.Items>
            {({ threadListItem }) => {
              const custom = threadListItem.custom as
                { messageCount?: number; lastMessageAt?: string } | undefined
              return (
                <ThreadListItemPrimitive.Root
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
                    threadListItem.id === threadId
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-foreground hover:bg-muted/70"
                  )}
                >
                  <ThreadListItemPrimitive.Trigger asChild>
                    <button type="button" className="min-w-0 flex-1 text-left">
                      <span className="block w-full truncate font-medium">
                        <ThreadListItemPrimitive.Title />
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {isRunning && threadListItem.id === threadId ? (
                          <span className="shimmer text-primary motion-reduce:animate-none">
                            {t("ai.activity.working")}
                          </span>
                        ) : (
                          <>
                            {custom?.messageCount ?? 0}{" "}
                            {t("ai.threads.messages_suffix")}
                            {custom?.lastMessageAt &&
                              ` · ${formatDate(custom.lastMessageAt, {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}`}
                          </>
                        )}
                      </span>
                    </button>
                  </ThreadListItemPrimitive.Trigger>
                  <button
                    type="button"
                    aria-label={t("ai.threads.delete")}
                    className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setPendingDelete({
                        threadId: threadListItem.id,
                        title: threadListItem.title ?? "",
                      })
                    }
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </ThreadListItemPrimitive.Root>
              )
            }}
          </ThreadListPrimitive.Items>
        </ThreadListPrimitive.Root>

        <div className="border-t p-3">
          <button
            type="button"
            onClick={openTrash}
            className="flex w-full items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground"
          >
            <Trash2 className="size-3" />
            {t("ai.threads.trash")}
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold">{t("ai.name")}</p>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              {isRunning ? (
                <>
                  <span aria-hidden="true">·</span>
                  <LoaderCircle className="size-3 shrink-0 animate-spin text-primary" />
                  <span className="shimmer motion-reduce:animate-none">
                    {t("ai.activity.working")}
                  </span>
                </>
              ) : (
                <>· {t("ai.tagline")}</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("ai.threads.trash")}
              title={t("ai.threads.trash")}
              onClick={openTrash}
              className="size-8 text-muted-foreground hover:text-foreground md:hidden"
            >
              <Trash2 className="size-4" />
            </Button>
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
        </div>
        <OlorinPanel className="min-h-0 flex-1" showHeader={false} />
      </main>

      <DeleteConversationDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title}
        busy={deleting}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
      <ConversationTrashDialog
        open={trashOpen}
        loading={trashLoading}
        error={trashError}
        conversations={trash}
        busyId={trashBusyId}
        onOpenChange={setTrashOpen}
        onRestore={(id) => void restore(id)}
        onDelete={(id) => void permanentlyDelete(id)}
        onEmpty={() => void emptyTrash()}
        onRetry={() => void loadTrash()}
      />
    </>
  )
}
