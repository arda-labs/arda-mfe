import { useCallback, useEffect, useRef, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { apiUrl } from "@workspace/api/url"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { statisticalApi, type FormTemplate } from "../api"
import { TemplateDialog } from "./components/template-dialog"

/** QCMS form templates (W5b): catalog + field builder + JSON export/import. */
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
