import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { statisticalApi, type FormTemplate } from "../../api"

type SchemaField = { key: string; label: string; type: string; required: boolean }

const FIELD_TYPES = ["text", "number", "date", "select", "checkbox", "textarea"]

function parseSchema(schema: unknown): {
  rest: Record<string, unknown>
  fields: SchemaField[]
} {
  const src = (schema ?? {}) as Record<string, unknown>
  const { fields, ...rest } = src
  const list = Array.isArray(fields) ? fields : []
  return {
    rest,
    fields: list.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>
      return {
        key: String(item.key ?? ""),
        label: String(item.label ?? ""),
        type: String(item.type ?? "text"),
        required: Boolean(item.required),
      }
    }),
  }
}

/** Form-template editor: structured field builder (schema = rest + fields[]). */
export function TemplateDialog({
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
  const [rest, setRest] = useState<Record<string, unknown>>({})
  const [fields, setFields] = useState<SchemaField[]>([])
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(template?.code ?? "")
    setName(template?.name ?? "")
    setCaseType(template?.workflow_case_type ?? "")
    const parsed = parseSchema(template?.schema)
    setRest(parsed.rest)
    setFields(parsed.fields)
  }, [open, template])

  const updateField = (index: number, patch: Partial<SchemaField>) =>
    setFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )

  const moveField = (index: number, direction: -1 | 1) =>
    setFields((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("statistical.forms.validation.required"))
      return
    }
    const cleanFields = fields
      .filter((f) => f.key.trim() !== "" || f.label.trim() !== "")
      .map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
      }))
    setPending(true)
    try {
      await statisticalApi.upsertFormTemplate({
        code: code.trim(),
        name: name.trim(),
        workflow_case_type: caseType || undefined,
        schema: { ...rest, fields: cleanFields },
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
      <DialogContent className="max-w-2xl">
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
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("statistical.forms.field.fields")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setFields((prev) => [
                  ...prev,
                  { key: "", label: "", type: "text", required: false },
                ])
              }
            >
              {t("statistical.forms.field.add")}
            </Button>
          </div>
          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t("statistical.forms.field.empty")}
            </p>
          )}
          {fields.map((field, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-40 font-mono text-xs"
                value={field.key}
                placeholder={t("statistical.forms.field.key")}
                onChange={(e) => updateField(index, { key: e.target.value })}
              />
              <Input
                className="h-8 w-48 text-xs"
                value={field.label}
                placeholder={t("statistical.forms.field.label")}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value })}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(index, { required: e.target.checked })
                  }
                />
                {t("statistical.forms.field.required")}
              </label>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled={index === 0}
                  onClick={() => moveField(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled={index === fields.length - 1}
                  onClick={() => moveField(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-destructive hover:underline"
                  onClick={() =>
                    setFields((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  {t("common.action.delete")}
                </button>
              </div>
            </div>
          ))}
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
