import { useCallback, useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { notify } from "@workspace/ui/feedback/notify"
import { deleteEmailDesign, listEmailDesigns, upsertEmailDesign } from "../api"
import { type EmailDesign } from "../types"

/**
 * Reusable email designs — one HTML layout referenced by many event templates
 * through noti_templates.design_code. Paste HTML from an external email editor.
 */
export function DesignsTab() {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [pending, setPending] = useState(false)
  const [items, setItems] = useState<EmailDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
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

  const save = async () => {
    if (!code.trim() || !bodyHtml.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    setPending(true)
    try {
      await upsertEmailDesign({
        code: code.trim(),
        name: name.trim(),
        subject: subject.trim(),
        body_html: bodyHtml,
        is_active: true,
      })
      notify.success(t("platform.notifications.save_success"))
      setCode("")
      setName("")
      setSubject("")
      setBodyHtml("")
      await load()
    } catch {
      notify.error(t("platform.notifications.save_failed"))
    } finally {
      setPending(false)
    }
  }

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
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.code")}</Label>
          <Input
            className="font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.subject")}</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="w-full space-y-1.5">
          <Label>{t("platform.notifications.field.body_html")}</Label>
          <Textarea
            className="min-h-[160px] font-mono text-xs"
            value={bodyHtml}
            placeholder="<html>…"
            onChange={(e) => setBodyHtml(e.target.value)}
          />
        </div>
        <Button onClick={() => void save()} disabled={pending}>
          {t("common.action.save")}
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
              <TableHead />
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                    title={t("common.action.delete")}
                    onClick={() => setDeleteTarget(row)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
