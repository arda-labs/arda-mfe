import { useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  ControlInfoCard,
  ObjectInfoCard,
} from "@workspace/posting-flow/posting-flow-shell"
import type { ObjectInfoValue } from "@workspace/posting-flow/types"
import { parseMoneyInput, toMinor, todayISO } from "@workspace/format"
import {
  loanApi,
  type LoanAdjustmentKind,
  type LoanAgreement,
  type LoanContract,
} from "../../api"
import {
  useControlInfoLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
} from "../../loan-batches/labels"
import { ContractSelect } from "./contract-select"
import { RepayPlanGrid } from "./repay-plan-grid"
import { ADJUSTMENT_KIND_SPECS, type KindFieldSpec } from "../kind-spec"

/**
 * Tab 1 "Thông tin điều chỉnh" — form per-kind dựng từ `ADJUSTMENT_KIND_SPECS`
 * (payload keys = chính xác `validateKindPayload` của BE). Nút "Tạo hồ sơ"
 * gọi createAdjustment → toast mã hồ sơ (row DRAFT) — màn giữ nguyên để
 * trình duyệt từ tab 2. Trader + ControlInfoCard như các màn batch.
 */
export function AdjustmentInfoTab({ kind }: { kind: LoanAdjustmentKind }) {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const spec = ADJUSTMENT_KIND_SPECS[kind]

  const [contract, setContract] = useState<LoanContract | null>(null)
  const [agreementCode, setAgreementCode] = useState("")
  const [agreements, setAgreements] = useState<{
    contractCode: string
    items: LoanAgreement[]
  }>({ contractCode: "", items: [] })
  const [effectiveDate, setEffectiveDate] = useState("")
  const [amount, setAmount] = useState("")
  const [payloadValues, setPayloadValues] = useState<Record<string, string>>({})
  const [savePending, setSavePending] = useState(false)

  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const controlLabels = useControlInfoLabels()

  const [trader, setTrader] = useState<ObjectInfoValue>(() => ({
    object_type: "EMPLOYEE",
    object_code: user?.employeeId ?? user?.username ?? "",
    object_name: user?.displayName || (user?.name ?? ""),
    id_number: "",
    issue_date: "",
    issue_place: "",
    address: "",
  }))

  const unitName =
    user?.tenantMemberships?.find((m) => m.tenantId === (user.activeTenantId ?? user.tenantId))
      ?.tenantName ?? user?.tenantMemberships?.[0]?.tenantName

  // Agreements của hợp đồng (thuận từ). Kết quả tag theo contract_code để
  // khi đổi hợp đồng không lộ agreements cũ trong lúc load.
  useEffect(() => {
    if (!contract) return
    let cancelled = false
    const contractCode = contract.contract_code
    loanApi
      .listAgreements(contractCode)
      .then((res) => {
        if (!cancelled) setAgreements({ contractCode, items: res.items })
      })
      .catch(() => {
        // Gợi ý agreements là phần tăng cường — lỗi không chặn nhập tay.
        if (!cancelled) setAgreements({ contractCode, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [contract])

  const withOutstanding =
    contract && agreements.contractCode === contract.contract_code
      ? agreements.items.filter((item) => item.outstanding_amt_minor > 0)
      : []

  const setPayload = (key: string, value: string) =>
    setPayloadValues((current) => ({ ...current, [key]: value }))

  const createAdjustment = async () => {
    if (!contract) {
      notify.error(t("loan.adjustment_validation.contract_required"))
      return
    }
    const amountMinor = amount.trim() ? toMinor(parseMoneyInput(amount) ?? 0) : null
    if (spec.amount === "required" && (amountMinor == null || amountMinor <= 0)) {
      notify.error(t("loan.adjustment_validation.amount_required"))
      return
    }
    if (spec.agreementSelect === "required" && !agreementCode.trim()) {
      notify.error(t("loan.adjustment_validation.agreement_required"))
      return
    }
    const payload: Record<string, unknown> = {}
    for (const field of spec.fields) {
      const raw = (payloadValues[field.key] ?? "").trim()
      if (!raw) {
        if (field.required) {
          notify.error(t("loan.adjustment_validation.payload_required"))
          return
        }
        continue
      }
      payload[field.key] = field.input === "number" ? Number(raw) : raw
    }
    // BE waiver: amount_minor OR payload.waiver_percent — cần một trong hai.
    const waiverPercentKey = spec.fields.some((field) => field.key === "waiver_percent")
    if (waiverPercentKey && !("waiver_percent" in payload) && (amountMinor == null || amountMinor <= 0)) {
      notify.error(t("loan.adjustment_validation.amount_or_percent_required"))
      return
    }
    // Trader metadata — BE Adjustment không có cột riêng nên lưu cùng payload
    // jsonb (validateKindPayload bỏ qua key thừa; mirror batch trader).
    payload["trader"] = {
      object_type: trader.object_type,
      object_code: trader.object_code,
      object_name: trader.object_name,
      id_number: trader.id_number || undefined,
      issue_date: trader.issue_date || undefined,
      issue_place: trader.issue_place || undefined,
      address: trader.address || undefined,
    }
    setSavePending(true)
    try {
      const created = await loanApi.createAdjustment(kind, {
        contract_code: contract.contract_code,
        agreement_code: agreementCode.trim() || undefined,
        effective_date: effectiveDate || undefined,
        amount_minor: amountMinor != null && amountMinor > 0 ? amountMinor : undefined,
        payload,
      })
      notify.success(
        t("loan.adjustment_screen.created_with_case", { case: created.id }),
        t("loan.draft_created_hint")
      )
    } catch (error) {
      notify.error(translateApiError(error, t("loan.adjustment_create_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="col-span-2 md:col-span-3">
              <ContractSelect
                value={contract?.contract_code ?? ""}
                onChange={(next) => {
                  setContract(next)
                  setAgreementCode("")
                }}
              />
            </div>
            {spec.agreementSelect !== "none" ? (
              <div className="space-y-1.5">
                <Label htmlFor="adjustment-agreement">
                  {t("loan.field.agreement_code")}
                  {spec.agreementSelect === "required" ? " *" : ""}
                </Label>
                {withOutstanding.length > 0 ? (
                  <Select
                    value={agreementCode || undefined}
                    onValueChange={setAgreementCode}
                  >
                    <SelectTrigger id="adjustment-agreement" className="w-full">
                      <SelectValue
                        placeholder={t("loan.adjustment_screen.placeholder.agreement")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {withOutstanding.map((item) => (
                        <SelectItem key={item.agreement_code} value={item.agreement_code}>
                          {item.agreement_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="adjustment-agreement"
                    value={agreementCode}
                    placeholder={t("loan.placeholder.agreement")}
                    onChange={(event) => setAgreementCode(event.target.value)}
                  />
                )}
              </div>
            ) : null}
            {spec.effectiveDateLabelKey ? (
              <div className="space-y-1.5">
                <Label htmlFor="adjustment-effective-date">
                  {t(spec.effectiveDateLabelKey)}
                </Label>
                <Input
                  id="adjustment-effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                />
              </div>
            ) : null}
            {spec.amount !== "none" ? (
              <div className="space-y-1.5">
                <Label htmlFor="adjustment-amount">
                  {t("loan.field.amount")}
                  {spec.amount === "required" ? " *" : ""}
                </Label>
                <Input
                  id="adjustment-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            ) : null}
            {spec.fields.map((field) => (
              <PayloadField
                key={field.key}
                field={field}
                value={payloadValues[field.key] ?? ""}
                onChange={(value) => setPayload(field.key, value)}
              />
            ))}
          </div>
          <ObjectInfoCard
            labels={objectLabels}
            value={trader}
            onChange={setTrader}
            objectTypes={objectTypes}
          />
        </div>
        <ControlInfoCard
          labels={controlLabels}
          unit={unitName}
          status={<Badge variant="secondary">{t("loan.batch.status_draft")}</Badge>}
          enteredAt={todayISO()}
          enteredBy={user?.displayName || (user?.name ?? "")}
        />
      </div>
      {kind === "debt-change" ? <RepayPlanGrid contractCode={contract?.id ?? ""} /> : null}
      <div className="flex justify-end">
        <Button onClick={() => void createAdjustment()} disabled={savePending}>
          {savePending ? t("common.action.saving") : t("loan.adjustment_screen.action_create")}
        </Button>
      </div>
    </div>
  )
}

/** Per-kind payload field — select/date/number/textarea theo spec. */
function PayloadField({
  field,
  value,
  onChange,
}: {
  field: KindFieldSpec
  value: string
  onChange: (next: string) => void
}) {
  const { t } = useI18n()
  const id = `adjustment-payload-${field.key}`
  const label = (
    <Label htmlFor={id}>
      {t(field.labelKey)}
      {field.required ? " *" : ""}
    </Label>
  )
  if (field.input === "select" && field.options && field.optionKeyPrefix) {
    return (
      <div className="space-y-1.5">
        {label}
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={t("loan.placeholder.select")} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`${field.optionKeyPrefix}.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
  if (field.input === "textarea") {
    return (
      <div className="col-span-2 space-y-1.5 md:col-span-3">
        {label}
        <Textarea
          id={id}
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {label}
      <Input
        id={id}
        type={field.input === "date" ? "date" : field.input === "number" ? "number" : "text"}
        step={field.input === "number" ? "any" : undefined}
        value={value}
        placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
