import { useCallback, useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { useI18n } from "@workspace/i18n"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import { deleteEmailDesign, listEmailDesigns } from "../api"
import { type EmailDesign } from "../types"
import { DesignDialog } from "./design-dialog"

/** Reusable email designs: list + create/edit dialog + delete. */
export function DesignsTab() {
  const { t } = useI18n()
  const [items, setItems] = useState<EmailDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmailDesign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailDesign | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await listEmailDesigns())
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEmailDesign(deleteTarget.id)
      notify.success(t("platform.notifications.delete_success"))
      setDeleteTarget(null)
      await load()
    } catch {
      notify.error(t("platform.notifications.delete_failed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("platform.notifications.design.hint")}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          {t("common.action.create")}
        </Button>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span>{t("platform.notifications.load_failed")}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t("platform.notifications.field.code")}</TableHead>
              <TableHead>{t("platform.notifications.field.name")}</TableHead>
              <TableHead>{t("platform.notifications.field.subject")}</TableHead>
              <TableHead>{t("common.field.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.field.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-4 text-center text-muted-foreground"
                >
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-4 text-center text-muted-foreground"
                >
                  {t("platform.notifications.empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs font-semibold text-primary">
                  {row.code}
                </TableCell>
                <TableCell>{row.name || "—"}</TableCell>
                <TableCell className="max-w-[280px] truncate">
                  {row.subject || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active
                      ? t("platform.working_hours.active")
                      : t("platform.working_hours.inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      title={t("common.action.edit")}
                      onClick={() => {
                        setEditing(row)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                      title={t("common.action.delete")}
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DesignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => load()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common.confirm.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirm.delete_description", {
                item: deleteTarget?.code ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
