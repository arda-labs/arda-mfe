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
  ControlInfoCard,
  ObjectInfoCard,
  PostingTabsShell,
} from "@workspace/posting-flow/posting-flow-shell"
import type { ObjectInfoValue } from "@workspace/posting-flow/types"
import {
  formatAmount,
  formatDateShort,
  fromMinor,
  isValidISODate,
  todayISO,
} from "@workspace/format"
import { collectionBatchApi, type LoanAgreement, type LoanContract } from "../../api"
import {
  useBatchTabsLabels,
  useControlInfoLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
} from "../../loan-batches/labels"
import { inputToMinor } from "../../loan-batches/row-math"
import { CollectionContractsTab, type CollectionRow } from "./contracts-tab"

const TAB_INFO = "collection-info"
const TAB_CONTRACTS = "collection-contracts"

/**
 * Thu nợ gốc + lãi (iteration 13) — EPAS batch on the PostingTabsShell, grid
 * gom nhóm theo plan_code giống Đăng ký giải ngân; mỗi dòng 3 cột tiền
 * (gốc ≤ dư nợ / lãi trong hạn / lãi quá hạn), tổng nhóm = Σ(principal +
 * interest + overdue) — tổng hồ sơ luôn suy ra từ dòng. Tab 1: ngày thu +
 * trader + diễn giải auto. Submit posts the whole collection batch.
 */
export function BatchCollectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const tabsLabels = useBatchTabsLabels(
    "loan.collections.batch.title",
    "loan.collections.batch.description"
  )
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const controlLabels = useControlInfoLabels()

  const [txnDate, setTxnDate] = useState(() => todayISO())
  /** null = follow the auto description; a typed string = user override. */
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null)
  const [rows, setRows] = useState<CollectionRow[]>([])
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

  // Diễn giải auto "Thu nợ ngày <date>" — null override follows the auto
  // value; user edits always win (no effect needed).
  const autoDescription = t("loan.collections.batch.description_auto", {
    date: formatDateShort(txnDate),
  })
  const description = descriptionOverride ?? autoDescription

  const addRows = (picked: (LoanAgreement & { contract: LoanContract })[]) => {
    setRows((prev) => {
      const seen = new Set(prev.map((row) => row.agreement.agreement_code))
      const added: CollectionRow[] = []
      for (const selection of picked) {
        if (seen.has(selection.agreement_code)) continue
        seen.add(selection.agreement_code)
        added.push({
          key: crypto.randomUUID(),
          contract: selection.contract,
          agreement: selection,
          principal: "",
          interest: "",
          overdueInterest: "",
        })
      }
      return [...prev, ...added]
    })
  }

  const updateRow = (key: string, patch: Partial<CollectionRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key))
  }

  const removeGroup = (planCode: string) => {
    setRows((prev) => prev.filter((row) => (row.agreement.plan_code ?? "") !== planCode))
  }

  const rowTotalMinor = (row: CollectionRow) =>
    inputToMinor(row.principal) + inputToMinor(row.interest) + inputToMinor(row.overdueInterest)

  const totalMinor = useMemo(
    () => rows.reduce((sum, row) => sum + rowTotalMinor(row), 0),
    [rows]
  )

  const submit = async () => {
    if (!isValidISODate(txnDate)) {
      notify.error(t("loan.batch.validation.date_required"))
      return
    }
    if (rows.length === 0) {
      notify.error(t("loan.collections.batch.validation.rows_required"))
      return
    }
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const principalMinor = inputToMinor(row.principal)
      const interestMinor = inputToMinor(row.interest)
      const overdueMinor = inputToMinor(row.overdueInterest)
      if (principalMinor <= 0 && interestMinor <= 0 && overdueMinor <= 0) {
        notify.error(t("loan.collections.batch.validation.amounts_required", { row: index + 1 }))
        return
      }
      if (principalMinor > row.agreement.outstanding_amt_minor) {
        notify.error(
          t("loan.collections.batch.validation.principal_exceeds_outstanding", {
            row: index + 1,
          })
        )
        return
      }
    }

    setSavePending(true)
    try {
      const created = await collectionBatchApi.create({
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
        rows: rows.map((row) => ({
          contract_code: row.contract.contract_code,
          agreement_code: row.agreement.agreement_code,
          principal_minor: inputToMinor(row.principal),
          interest_minor: inputToMinor(row.interest),
          overdue_interest_minor: inputToMinor(row.overdueInterest) || undefined,
        })),
      })
      notify.success(
        t("loan.collections.batch.created", { case: created.case_code || created.case_id })
      )
      navigate("/loans/collections")
    } catch (error) {
      notify.error(translateApiError(error, "loan.collections.batch.create_failed"))
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
          label: t("loan.collections.batch.tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="collection-date">
                      {t("loan.collections.batch.field.txn_date")}
                    </Label>
                    <Input
                      id="collection-date"
                      type="date"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="collection-description">{t("common.field.description")}</Label>
                    <Input
                      id="collection-description"
                      value={description}
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
            <CollectionContractsTab
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
            <Button variant="outline" onClick={() => navigate("/loans/collections")}>
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
