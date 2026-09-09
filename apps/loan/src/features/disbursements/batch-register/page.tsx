import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Save } from "lucide-react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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
  PostingTabsShell,
} from "@workspace/posting-flow/posting-flow-shell"
import type { ObjectInfoValue } from "@workspace/posting-flow/types"
import {
  formatDateShort,
  formatAmount,
  fromMinor,
  isValidISODate,
  todayISO,
} from "@workspace/format"
import { disbursementBatchApi, type LoanAgreement, type LoanContract } from "../../api"
import {
  useBatchTabsLabels,
  useControlInfoLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
} from "../../loan-batches/labels"
import { headroomMinor, inputToMinor } from "../../loan-batches/row-math"
import { RegisterContractsTab } from "./contracts-tab"

const TAB_INFO = "disburse-info"
const TAB_CONTRACTS = "disburse-contracts"

export interface RegisterRow {
  key: string
  contract: LoanContract
  agreement: LoanAgreement
  /** Số tiền giải ngân (major-unit input). */
  amount: string
}

/**
 * Đăng ký giải ngân (iteration 13) — EPAS list-edit-construct batch on the
 * PostingTabsShell. Tab 1: ngày/hình thức hạch toán/tài khoản/diễn giải +
 * trader; tab 2: grid gom nhóm theo plan_code, mỗi dòng một agreement với
 * số tiền riêng — tổng hồ sơ luôn suy ra từ các dòng. Submit posts the whole
 * batch (POST /api/loan/disbursement-batches); BE tự đọc plan_code từ
 * agreement và build bút toán.
 */
export function BatchRegisterPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const tabsLabels = useBatchTabsLabels(
    "loan.disbursements.batch.register_title",
    "loan.disbursements.batch.register_description"
  )
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const controlLabels = useControlInfoLabels()

  const [txnDate, setTxnDate] = useState(() => todayISO())
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH">("TRANSFER")
  const [accountCode, setAccountCode] = useState("")
  /** null = follow the auto description; a typed string = user override. */
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null)
  const [rows, setRows] = useState<RegisterRow[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savePending, setSavePending] = useState(false)
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

  // Diễn giải auto "Giải ngân theo hồ sơ ngày <date>" — null override
  // follows the auto value; user edits always win (no effect needed).
  const autoDescription = t("loan.disbursements.batch.description_auto", {
    date: formatDateShort(txnDate),
  })
  const shownDescription = descriptionOverride ?? autoDescription

  const addRows = (picked: (LoanAgreement & { contract: LoanContract })[]) => {
    setRows((prev) => {
      const seen = new Set(prev.map((row) => row.agreement.agreement_code))
      const added: RegisterRow[] = []
      for (const selection of picked) {
        if (seen.has(selection.agreement_code)) continue
        seen.add(selection.agreement_code)
        added.push({
          key: crypto.randomUUID(),
          contract: selection.contract,
          agreement: selection,
          amount: "",
        })
      }
      return [...prev, ...added]
    })
  }

  const updateRow = (key: string, patch: Partial<RegisterRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key))
  }

  const removeGroup = (planCode: string) => {
    setRows((prev) =>
      prev.filter((row) => (row.agreement.plan_code ?? "") !== planCode)
    )
  }

  const rowAmountMinor = (row: RegisterRow) =>
    inputToMinor(row.amount, row.agreement.currency_code)

  const totalMinor = useMemo(
    () => rows.reduce((sum, row) => sum + rowAmountMinor(row), 0),
    [rows]
  )

  const submit = async () => {
    if (!isValidISODate(txnDate)) {
      notify.error(t("loan.batch.validation.date_required"))
      return
    }
    if (rows.length === 0) {
      notify.error(t("loan.disbursements.batch.validation.rows_required"))
      return
    }
    if (paymentMethod === "TRANSFER" && !accountCode.trim()) {
      notify.error(t("loan.disbursements.batch.validation.account_required"))
      return
    }
    for (const row of rows) {
      const amountMinor = rowAmountMinor(row)
      const index = rows.indexOf(row) + 1
      if (amountMinor <= 0) {
        notify.error(
          t("loan.disbursements.batch.validation.amount_positive", { row: index })
        )
        return
      }
      if (amountMinor > headroomMinor(row.contract, row.agreement)) {
        notify.error(
          t("loan.disbursements.batch.validation.headroom_exceeded", { row: index })
        )
        return
      }
    }

    setSavePending(true)
    try {
      const created = await disbursementBatchApi.createRegister({
        txn_date: txnDate,
        payment_method: paymentMethod,
        account_code: paymentMethod === "TRANSFER" ? accountCode.trim() : undefined,
        description: shownDescription || undefined,
        trader: {
          object_type: trader.object_type,
          object_code: trader.object_code,
          object_name: trader.object_name,
          id_number: trader.id_number || undefined,
          issue_date: trader.issue_date || undefined,
          issue_place: trader.issue_place || undefined,
          address: trader.address || undefined,
        },
        rows: rows.map((row) => ({
          contract_code: row.contract.contract_code,
          agreement_code: row.agreement.agreement_code,
          amount_minor: rowAmountMinor(row),
        })),
      })
      notify.success(
        t("loan.disbursements.batch.created", { case: created.case_code || created.case_id })
      )
      navigate("/loans/disbursements")
    } catch (error) {
      notify.error(
        translateApiError(error, "loan.disbursements.batch.create_failed")
      )
    } finally {
      setSavePending(false)
    }
  }

  return (
    <PostingTabsShell
      labels={tabsLabels}
      meta={
        <Badge variant="secondary" className="shrink-0">
          {t("loan.batch.status_draft")}
        </Badge>
      }
      tabs={[
        {
          id: TAB_INFO,
          label: t("loan.disbursements.batch.tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-date">
                      {t("loan.disbursements.batch.field.txn_date")}
                    </Label>
                    <Input
                      id="disburse-date"
                      type="date"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-method">
                      {t("loan.disbursements.batch.field.payment_method")}
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as "TRANSFER" | "CASH")}
                    >
                      <SelectTrigger id="disburse-method" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSFER">
                          {t("loan.disbursements.batch.payment.transfer")}
                        </SelectItem>
                        <SelectItem value="CASH">
                          {t("loan.disbursements.batch.payment.cash")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-account">
                      {t("loan.disbursements.batch.field.account_code")}
                    </Label>
                    <Input
                      id="disburse-account"
                      value={accountCode}
                      disabled={paymentMethod !== "TRANSFER"}
                      placeholder={
                        paymentMethod === "TRANSFER"
                          ? t("loan.disbursements.batch.placeholder.account_code")
                          : t("loan.disbursements.batch.placeholder.account_cash")
                      }
                      onChange={(e) => setAccountCode(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 md:col-span-3">
                    <Label htmlFor="disburse-description">{t("common.field.description")}</Label>
                    <Input
                      id="disburse-description"
                      value={shownDescription}
                      placeholder={autoDescription}
                      onChange={(e) => setDescriptionOverride(e.target.value)}
                    />
                  </div>
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
                status={t("loan.batch.status_draft")}
                enteredAt={todayISO()}
                enteredBy={user?.displayName || (user?.name ?? "")}
              />
            </div>
          ),
        },
        {
          id: TAB_CONTRACTS,
          label: t("loan.disbursements.batch.tab_contracts"),
          content: (
            <RegisterContractsTab
              rows={rows}
              pickerOpen={pickerOpen}
              onPickerOpenChange={setPickerOpen}
              onAddRows={addRows}
              onChangeRow={updateRow}
              onRemoveRow={removeRow}
              onRemoveGroup={removeGroup}
            />
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {t("loan.batch_grid.total_label")}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(fromMinor(totalMinor), "VND")}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/loans/disbursements")}>
              {t("common.action.cancel")}
            </Button>
            <Button onClick={() => void submit()} disabled={savePending}>
              <Save className="mr-1.5 size-4" />
              {savePending ? t("common.action.saving") : t("loan.batch.action.submit")}
            </Button>
          </div>
        </div>
      }
    />
  )
}
