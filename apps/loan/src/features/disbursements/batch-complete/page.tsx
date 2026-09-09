import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MoreHorizontal, Save } from "lucide-react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  ControlInfoCard,
  ObjectInfoCard,
  PostingTabsShell,
} from "@workspace/posting-flow/posting-flow-shell"
import type { ObjectInfoValue } from "@workspace/posting-flow/types"
import { formatAmount, formatDateShort, fromMinor, isValidISODate, todayISO } from "@workspace/format"
import { loanApi, disbursementBatchApi, type LoanDisbursementBatch } from "../../api"
import {
  useBatchTabsLabels,
  useControlInfoLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
} from "../../loan-batches/labels"
import { ChooseSourceBatchDialog } from "../../loan-batches/components/choose-source-batch-dialog"
import { CompleteRowsTab, completeAmountMinor, type CompleteRow } from "./rows-tab"

const TAB_INFO = "complete-info"
const TAB_ROWS = "complete-rows"

/**
 * Hoàn tất giải ngân (iteration 13) — draw against a POSTED REGISTER batch.
 * Tab 1: ngày hoàn tất + phiếu gốc (ChooseSourceBatchDialog) + trader;
 * tab 2 (rows-tab): các dòng của phiếu gốc group theo plan với cột sửa được
 * Số tiền hoàn tất (≤ phiếu gốc) + Đóng HĐ (amount = 0); bút toán dự kiến
 * LNM_DISB_COMPLETE render theo items BE trả về. Submit posts the batch.
 */
export function BatchCompletePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const tabsLabels = useBatchTabsLabels(
    "loan.disbursements.batch.complete_title",
    "loan.disbursements.batch.complete_description"
  )
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const controlLabels = useControlInfoLabels()

  const [txnDate, setTxnDate] = useState(() => todayISO())
  /** null = follow the auto description; a typed string = user override. */
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null)
  const [source, setSource] = useState<LoanDisbursementBatch | null>(null)
  const [rows, setRows] = useState<CompleteRow[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailPending, setDetailPending] = useState(false)
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

  // Diễn giải auto "Hoàn tất giải ngân phiếu <case_code>" — null override
  // follows the auto value; user edits always win (no effect needed).
  const autoDescription = source
    ? t("loan.disbursements.batch.complete_description_auto", {
        case: source.case_code || source.workflow_case_code || source.id.slice(0, 8),
      })
    : ""
  const description = descriptionOverride ?? autoDescription

  const pickSource = async (batch: LoanDisbursementBatch) => {
    setPickerOpen(false)
    setSource(batch)
    setRows([])
    setDetailPending(true)
    try {
      const detail = await disbursementBatchApi.detail(batch.id)
      setSource(detail)
      const detailRows = detail.rows ?? []
      // Enrich rows with plan_code (group key) — BE detail rows don't carry
      // plan; one agreements call per distinct contract. Fail-closed: a
      // broken agreements endpoint aborts the pick (the caller sees the
      // error) instead of silently regrouping everything as "no plan".
      const contracts = [...new Set(detailRows.map((row) => row.contract_code))]
      const agreementLists = await Promise.all(
        contracts.map((contractCode) => loanApi.listAgreements(contractCode))
      )
      const planByAgreement = new Map<string, string>()
      for (const result of agreementLists) {
        for (const agreement of result.items) {
          planByAgreement.set(agreement.agreement_code, agreement.plan_code ?? "")
        }
      }
      setRows(
        detailRows.map((row) => ({
          ...row,
          key: crypto.randomUUID(),
          amount: String(fromMinor(row.amount_minor)),
          isClosed: row.is_closed ?? false,
          planCode: planByAgreement.get(row.agreement_code) ?? "",
        }))
      )
    } catch (error) {
      notify.error(
        translateApiError(error, "loan.disbursements.batch.source_dialog.detail_failed")
      )
      setSource(null)
    } finally {
      setDetailPending(false)
    }
  }

  const updateRow = (key: string, patch: Partial<CompleteRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const submit = async () => {
    if (!source) {
      notify.error(t("loan.disbursements.batch.validation.source_required"))
      return
    }
    if (!isValidISODate(txnDate)) {
      notify.error(t("loan.batch.validation.date_required"))
      return
    }
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      if (!row.isClosed && completeAmountMinor(row) > row.amount_minor) {
        notify.error(
          t("loan.disbursements.batch.validation.amount_exceeds_initial", { row: index + 1 })
        )
        return
      }
    }
    const bodyRows = rows
      .filter((row) => row.isClosed || completeAmountMinor(row) > 0)
      .map((row) => ({
        contract_code: row.contract_code,
        agreement_code: row.agreement_code,
        amount_minor: completeAmountMinor(row),
        is_closed: row.isClosed || undefined,
      }))
    if (bodyRows.length === 0) {
      notify.error(t("loan.disbursements.batch.validation.rows_required"))
      return
    }

    setSavePending(true)
    try {
      const created = await disbursementBatchApi.createComplete({
        source_batch_id: source.id,
        txn_date: txnDate,
        description: description || undefined,
        trader: {
          object_type: trader.object_type,
          object_code: trader.object_code,
          object_name: trader.object_name,
          id_number: trader.id_number || undefined,
          issue_date: trader.issue_date || undefined,
          issue_place: trader.issue_place || undefined,
          address: trader.address || undefined,
        },
        rows: bodyRows,
      })
      notify.success(
        t("loan.disbursements.batch.complete_created", {
          case: created.case_code || created.case_id,
        })
      )
      navigate("/loans/disbursements")
    } catch (error) {
      notify.error(translateApiError(error, "loan.disbursements.batch.complete_failed"))
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
          label: t("loan.disbursements.batch.complete_tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <ChooseSourceBatchDialog
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  onPick={(batch) => void pickSource(batch)}
                />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="complete-date">
                      {t("loan.disbursements.batch.complete_field_txn_date")}
                    </Label>
                    <Input
                      id="complete-date"
                      type="date"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>{t("loan.disbursements.batch.source_label")}</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={
                          source
                            ? t("loan.disbursements.batch.source_value", {
                                case:
                                  source.case_code ||
                                  source.workflow_case_code ||
                                  source.id.slice(0, 8),
                                date: formatDateShort(source.txn_date),
                                amount: formatAmount(
                                  fromMinor(source.total_amt_minor ?? 0),
                                  "VND"
                                ),
                              })
                            : ""
                        }
                        placeholder={t("loan.disbursements.batch.source_placeholder")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label={t("loan.disbursements.batch.source_label")}
                        onClick={() => setPickerOpen(true)}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5 md:col-span-3">
                    <Label htmlFor="complete-description">{t("common.field.description")}</Label>
                    <Input
                      id="complete-description"
                      value={description}
                      placeholder={autoDescription || undefined}
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
          id: TAB_ROWS,
          label: t("loan.disbursements.batch.tab_contracts"),
          content: (
            <CompleteRowsTab
              rows={rows}
              detailPending={detailPending}
              onChangeRow={updateRow}
            />
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/loans/disbursements")}>
            {t("common.action.cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={savePending || detailPending || !source}
          >
            <Save className="mr-1.5 size-4" />
            {savePending ? t("common.action.saving") : t("loan.batch.action.submit")}
          </Button>
        </div>
      }
    />
  )
}
