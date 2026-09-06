import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { translateApiError } from "@workspace/i18n"
import { mdmApi, mdmCatalogs, type MdmCatalogKey, type MdmItem } from "../api"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export function MdmPage() {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState<MdmCatalogKey>("currencies")
  const [items, setItems] = useState<MdmItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MdmItem | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", description: "", attributes: "" })

  const loadItems = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await mdmApi.listItems(catalog)
      setItems(result)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [catalog])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const openCreate = () => {
    setForm({ code: "", name: "", description: "", attributes: "" })
    setDialogOpen(true)
  }

  const submitCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error(t("mdm.validation.code_name_required"))
      return
    }
    let attributes: unknown = undefined
    if (form.attributes.trim()) {
      try {
        attributes = JSON.parse(form.attributes)
      } catch {
        notify.error(t("mdm.validation.attributes_json"))
        return
      }
    }
    setSavePending(true)
    try {
      await mdmApi.createItem(catalog, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        attributes: attributes as Record<string, unknown> | undefined,
      })
      notify.success(t("mdm.saved"))
      setDialogOpen(false)
      await loadItems()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  const submitDelete = async () => {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await mdmApi.deleteItem(catalog, deleteTarget.id)
      notify.success(t("mdm.deleted"))
      setDeleteTarget(null)
      await loadItems()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.delete_failed")))
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("mdm.title")}
        description={t("mdm.description")}
        actions={
          <Button onClick={openCreate}>{t("mdm.create")}</Button>
        }
      />

      <Select value={catalog} onValueChange={(value) => setCatalog(value as MdmCatalogKey)}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {mdmCatalogs.map((entry) => (
            <SelectItem key={entry.key} value={entry.key}>
              {t(entry.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loadError ? (
        <p className="text-sm text-destructive">{t("mdm.load_failed")}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">{t("mdm.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("mdm.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("mdm.field.code")}</th>
                <th className="px-3 py-2 font-medium">{t("mdm.field.name")}</th>
                <th className="px-3 py-2 font-medium">{t("mdm.field.scope")}</th>
                <th className="px-3 py-2 font-medium">{t("mdm.field.status")}</th>
                <th className="px-3 py-2 font-medium">{t("mdm.field.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-[13px]">{item.code}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">
                    {item.tenant_id ? (
                      <Badge variant="outline">{item.tenant_id}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("mdm.scope.global")}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={item.is_active ? "default" : "outline"}
                      className={cn(!item.is_active && "text-muted-foreground")}
                    >
                      {item.is_active ? t("mdm.status.active") : t("mdm.status.inactive")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {item.tenant_id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        {t("mdm.delete")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("mdm.scope.readonly")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mdm.create")}</DialogTitle>
            <DialogDescription>{t("mdm.dialog_description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mdm-code">{t("mdm.field.code")}</Label>
              <Input
                id="mdm-code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mdm-name">{t("mdm.field.name")}</Label>
              <Input
                id="mdm-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mdm-description">{t("mdm.field.description")}</Label>
              <Input
                id="mdm-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mdm-attributes">{t("mdm.field.attributes")}</Label>
              <Textarea
                id="mdm-attributes"
                rows={4}
                placeholder='{"symbol":"₫","decimal_places":0}'
                value={form.attributes}
                onChange={(event) => setForm((current) => ({ ...current, attributes: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("mdm.cancel")}
            </Button>
            <Button onClick={() => void submitCreate()} disabled={savePending}>
              {t("mdm.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mdm.delete_confirm_title")}</DialogTitle>
            <DialogDescription>
              {t("mdm.delete_confirm_description").replace("{code}", deleteTarget?.code ?? "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("mdm.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void submitDelete()} disabled={deletePending}>
              {t("mdm.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
