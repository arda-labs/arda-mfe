import { useCallback, useEffect, useRef, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { apiUrl } from "@workspace/api/url"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { statisticalApi, type FormTemplate } from "../api"

/** QCMS form templates (W5b): catalog + JSON export/import (per-row). */
export function FormsPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FormTemplate | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await statisticalApi.listFormTemplates(true)
      setItems(result.items)
    } catch {
      setItems([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const exportTemplate = async (code: string) => {
    try {
      const response = await fetch(apiUrl(statisticalApi.formTemplateExportUrl(code)), {
        credentials: "include",
      })
      if (!response.ok) throw new Error(String(response.status))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${code}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      notify.error(t("statistical.forms.export_failed"))
    }
  }

  const importTemplate = async (file: File) => {
    try {
      const text = await file.text()
      await statisticalApi.importFormTemplate(JSON.parse(text))
      notify.success(t("statistical.forms.import_success"))
      await load()
    } catch {
      notify.error(t("statistical.forms.import_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("statistical.forms.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("statistical.forms.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importTemplate(file)
              event.target.value = ""
            }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            {t("statistical.forms.import")}
          </Button>
          <Button
            onClick={() => {
              setEditTarget(null)
              setFormOpen(true)
            }}
          >
            {t("statistical.forms.create")}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("common.field.code")}</th>
              <th className="px-3 py-2">{t("common.field.name")}</th>
              <th className="px-3 py-2">{t("statistical.forms.field.case_type")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  {t("statistical.forms.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  {t("statistical.forms.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  {t("statistical.forms.empty")}
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{row.code}</td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {row.workflow_case_type || "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active ? t("statistical.catalogs.active") : t("statistical.catalogs.inactive")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => void exportTemplate(row.code)}
                    >
                      {t("statistical.forms.export")}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        setEditTarget(row)
                        setFormOpen(true)
                      }}
                    >
                      {t("common.action.edit")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TemplateDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editTarget}
        onSaved={() => load()}
      />
    </div>
  )
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: FormTemplate | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [caseType, setCaseType] = useState("")
  const [schema, setSchema] = useState("{}")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(template?.code ?? "")
    setName(template?.name ?? "")
    setCaseType(template?.workflow_case_type ?? "")
    setSchema(JSON.stringify(template?.schema ?? {}, null, 2))
  }, [open, template])

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("statistical.forms.validation.required"))
      return
    }
    let parsed: Record<string, unknown>
    try {
      parsed = schema.trim() ? JSON.parse(schema) : {}
    } catch {
      notify.error(t("statistical.catalogs.validation.invalid_json"))
      return
    }
    setPending(true)
    try {
      await statisticalApi.upsertFormTemplate({
        code: code.trim(),
        name: name.trim(),
        workflow_case_type: caseType || undefined,
        schema: parsed,
        is_active: true,
      })
      notify.success(t("statistical.forms.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("statistical.forms.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {template ? t("statistical.forms.edit") : t("statistical.forms.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("common.field.code")}</Label>
            <Input
              value={code}
              disabled={Boolean(template)}
              className="font-mono"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("statistical.forms.field.case_type")}</Label>
            <Input value={caseType} onChange={(e) => setCaseType(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>{t("statistical.forms.field.schema")}</Label>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
