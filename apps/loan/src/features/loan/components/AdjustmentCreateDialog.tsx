import { useEffect, useMemo, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
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
import { parseMoneyInput, toMinor } from "@workspace/format"
import {
  loanAdjustmentKinds,
  loanApi,
  type LoanAdjustmentKind,
} from "../../api"

/**
 * Per-kind payload contract — mirrors loan-service
 * `validateKindPayload` (internal/service/adjustment_service.go) 1:1:
 *   - debt-change → payload.to_debt_group_code
 *   - rate-change → payload.new_rate
 *   - restructure → payload.new_term + payload.new_maturity_date
 *   - waiver      → amount_minor OR payload.waiver_percent
 *   - writeoff    → amount_minor AND payload.reason
 *   - recovery    → amount_minor AND top-level agreement_code
 *   - fund-check  → payload.result
 *   - revenue-allocation / vfu-fee-allocation → amount_minor
 *   - off-balance-export → payload.reason
 *   - mortgage-adjust → no payload validation on the BE
 */
type PayloadFieldType = "text" | "number" | "date"

const PAYLOAD_FIELDS: Record<
  LoanAdjustmentKind,
  { key: string; type: PayloadFieldType; required: boolean }[]
> = {
  "debt-change": [{ key: "to_debt_group_code", type: "text", required: true }],
  "rate-change": [{ key: "new_rate", type: "number", required: true }],
  restructure: [
    { key: "new_term", type: "number", required: true },
    { key: "new_maturity_date", type: "date", required: true },
  ],
  waiver: [{ key: "waiver_percent", type: "number", required: false }],
  writeoff: [{ key: "reason", type: "text", required: true }],
  recovery: [],
  "fund-check": [{ key: "result", type: "text", required: true }],
  "revenue-allocation": [],
  "vfu-fee-allocation": [],
  "off-balance-export": [{ key: "reason", type: "text", required: true }],
  "mortgage-adjust": [],
}

/** Kinds where the top-level amount_minor is mandatory (BE validate). */
const AMOUNT_REQUIRED: ReadonlySet<LoanAdjustmentKind> = new Set([
  "writeoff",
  "recovery",
  "revenue-allocation",
  "vfu-fee-allocation",
])

/** recovery also requires the top-level agreement_code (BE validate). */
const AGREEMENT_REQUIRED: ReadonlySet<LoanAdjustmentKind> = new Set(["recovery"])

type Form = {
  contract_code: string
  agreement_code: string
  effective_date: string
  amount: string
  payload: Record<string, string>
}

const emptyForm: Form = {
  contract_code: "",
  agreement_code: "",
  effective_date: "",
  amount: "",
  payload: {},
}

/**
 * Create dialog for the uniform adjustment flows: one base form (contract /
 * agreement / effective date / amount) plus the per-kind payload fields with
 * the exact BE key names. Creates a DRAFT row — submit to the workbench
 * happens from the flows list.
 */
export function AdjustmentCreateDialog({
  kind,
  open,
  onOpenChange,
  onSaved,
}: {
  kind: LoanAdjustmentKind
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<Form>(() => ({ ...emptyForm, payload: {} }))
  const [savePending, setSavePending] = useState(false)

  const fields = useMemo(() => PAYLOAD_FIELDS[kind], [kind])

  useEffect(() => {
    if (!open) return
    setForm({ ...emptyForm, payload: {} })
  }, [open, kind])

  const setPayload = (key: string, value: string) =>
    setForm((current) => ({
      ...current,
      payload: { ...current.payload, [key]: value },
    }))

  const submit = async () => {
    if (!form.contract_code.trim()) {
      notify.error(t("loan.adjustment_validation.contract_required"))
      return
    }
    if (AGREEMENT_REQUIRED.has(kind) && !form.agreement_code.trim()) {
      notify.error(t("loan.adjustment_validation.agreement_required"))
      return
    }
    const amountMinor = form.amount.trim()
      ? toMinor(parseMoneyInput(form.amount) ?? 0)
      : null
    if (AMOUNT_REQUIRED.has(kind) && (amountMinor == null || amountMinor <= 0)) {
      notify.error(t("loan.adjustment_validation.amount_required"))
      return
    }
    const payload: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = form.payload[field.key]?.trim() ?? ""
      if (!raw) {
        if (field.required) {
          notify.error(t("loan.adjustment_validation.payload_required"))
          return
        }
        continue
      }
      payload[field.key] = field.type === "number" ? Number(raw) : raw
    }
    // waiver: BE accepts amount_minor OR payload.waiver_percent.
    if (kind === "waiver" && amountMinor == null && !("waiver_percent" in payload)) {
      notify.error(t("loan.adjustment_validation.amount_or_percent_required"))
      return
    }
    setSavePending(true)
    try {
      await loanApi.createAdjustment(kind, {
        contract_code: form.contract_code.trim(),
        agreement_code: form.agreement_code.trim() || undefined,
        effective_date: form.effective_date || undefined,
        amount_minor: amountMinor != null && amountMinor > 0 ? amountMinor : undefined,
        payload,
      })
      notify.success(t("loan.adjustment_created"), t("loan.draft_created_hint"))
      onOpenChange(false)
      setForm({ ...emptyForm, payload: {} })
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.adjustment_create_failed")))
    } finally {
      setSavePending(false)
    }
  }

  const kindLabel = (key: LoanAdjustmentKind) => {
    const entry = loanAdjustmentKinds.find((item) => item.key === key)
    return entry ? t(entry.labelKey) : key
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("loan.adjustment_create.title")}
            <Badge variant="secondary">{kindLabel(kind)}</Badge>
          </DialogTitle>
          <DialogDescription>{t("loan.adjustment_create.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="adj-contract">{t("loan.field.contract_code")}</Label>
            <Input
              id="adj-contract"
              value={form.contract_code}
              onChange={(e) => setForm((c) => ({ ...c, contract_code: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-agreement">
              {t("loan.field.agreement_code")}
              {AGREEMENT_REQUIRED.has(kind) ? " *" : ""}
            </Label>
            <Input
              id="adj-agreement"
              value={form.agreement_code}
              placeholder={t("loan.placeholder.agreement")}
              onChange={(e) => setForm((c) => ({ ...c, agreement_code: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-effective">{t("loan.field.effective_date")}</Label>
            <Input
              id="adj-effective"
              type="date"
              value={form.effective_date}
              onChange={(e) => setForm((c) => ({ ...c, effective_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">
              {t("loan.field.amount")}
              {AMOUNT_REQUIRED.has(kind) || kind === "waiver" ? " *" : ""}
            </Label>
            <Input
              id="adj-amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
            />
          </div>
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`adj-${field.key}`}>
                {t(`loan.adjustment_field.${field.key}`)}
                {field.required ? " *" : ""}
              </Label>
              <Input
                id={`adj-${field.key}`}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                step={field.type === "number" ? "any" : undefined}
                value={form.payload[field.key] ?? ""}
                onChange={(e) => setPayload(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
