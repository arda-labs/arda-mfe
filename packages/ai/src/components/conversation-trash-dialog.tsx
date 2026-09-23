import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react"
import type { OlorinConversation } from "../lib/conversations"

export function ConversationTrashDialog({
  open,
  loading,
  conversations,
  busyId,
  onOpenChange,
  onRestore,
  onDelete,
  onEmpty,
}: {
  open: boolean
  loading: boolean
  conversations: OlorinConversation[]
  busyId: string | null
  onOpenChange: (open: boolean) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onEmpty: () => void
}) {
  const { t, formatDate } = useI18n()
  const [confirm, setConfirm] = useState<"empty" | string | null>(null)
  const selected = conversations.find((item) => item.threadId === confirm)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="size-4 text-muted-foreground" />
              {t("ai.threads.trash")}
            </DialogTitle>
            <DialogDescription>
              {t("ai.threads.trash_retention_hint")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(65dvh,520px)] min-h-32 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                {t("ai.threads.trash_loading")}
              </div>
            ) : conversations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("ai.threads.trash_empty")}
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((item) => (
                  <li
                    key={item.threadId}
                    className="flex flex-col gap-3 rounded-lg border border-transparent p-3 hover:border-border hover:bg-muted/30 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title || item.threadId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.expiresAt
                          ? t("ai.threads.trash_expires", {
                              date: formatDate(item.expiresAt, {
                                dateStyle: "medium",
                              }),
                            })
                          : item.deletedAt
                            ? t("ai.threads.trash_deleted", {
                                date: formatDate(item.deletedAt, {
                                  dateStyle: "medium",
                                }),
                              })
                            : t("ai.threads.trash_expiry_fallback")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busyId !== null}
                        onClick={() => onRestore(item.threadId)}
                      >
                        {busyId === item.threadId ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        {t("ai.threads.restore")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("ai.threads.delete_permanently")}
                        title={t("ai.threads.delete_permanently")}
                        disabled={busyId !== null}
                        onClick={() => setConfirm(item.threadId)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {conversations.length > 0 && (
            <div className="flex justify-end border-t px-5 py-3">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                disabled={loading || busyId !== null}
                onClick={() => setConfirm("empty")}
              >
                <Trash2 className="size-3.5" />
                {t("ai.threads.empty_trash")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(value) => {
          if (!value) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "empty"
                ? t("ai.threads.empty_trash_confirm_title")
                : t("ai.threads.delete_permanently_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "empty"
                ? t("ai.threads.empty_trash_confirm_description")
                : t("ai.threads.delete_permanently_confirm_description", {
                    title: selected?.title || selected?.threadId || "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ai.threads.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm === "empty") onEmpty()
                else if (typeof confirm === "string") onDelete(confirm)
                setConfirm(null)
              }}
            >
              {t("ai.threads.delete_permanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
