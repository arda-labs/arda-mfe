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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  ControlInfoCard,
  ObjectInfoCard,
  PostingTabsShell,
} from "@workspace/posting-flow/posting-flow-shell"
import { EntryLinesGrid } from "@workspace/posting-flow/entry-lines-grid"
import {
  computeTotals,
  newEntryLineRow,
} from "@workspace/posting-flow/entry-lines"
import type { EntryLineRow, ObjectInfoValue } from "@workspace/posting-flow/types"
import { formatAmount, fromMinor, isValidISODate, parseMoneyInput, todayISO, toMinor } from "@workspace/format"
import { financeApi, postingCaseApi } from "../api"
import {
  useObjectInfoLabels,
  useObjectTypeOptions,
  usePostingFlowLabels,
  usePostingTabsLabels,
} from "./labels"

const TAB_INFO = "transaction-info"
const TAB_LINES = "accounting-lines"

/**
 * Off-balance init form (FAC.201.01, Nhập/xuất ngoại bảng) on the CRM-style
 * PostingTabsShell. Loại nghiệp vụ pins the direction of every line
 * (Nhập ngoại bảng → DEBIT, Xuất ngoại bảng → CREDIT); the single Số tiền
 * total syncs to all rows (each row's amount is disabled in the grid). The
 * account picker only offers nature-B accounts — it reads the COA v2 chart
 * (`/api/finance/coa/accounts?nature=B`, the table posting validation
 * resolves against) with postable rows + q filtered client-side. No payment
 * method/account/document type, no Dr/Cr totals pair — one total.
 */
export function OffBalanceFormPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const labels = usePostingFlowLabels()
  const tabsShellLabels = usePostingTabsLabels("finance.posting.off_balance.init_title")
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()

  const [offBalanceKind, setOffBalanceKind] = useState<"IMPORT" | "EXPORT">("IMPORT")
  const [amount, setAmount] = useState("")
  const [accountingDate, setAccountingDate] = useState(() => todayISO())
  const [currency, setCurrency] = useState("VND")
  const [description, setDescription] = useState("")
  const [rows, setRows] = useState<EntryLineRow[]>(() => initialRows("IMPORT"))
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

  const direction = offBalanceKind === "IMPORT" ? "DEBIT" : "CREDIT"
  const totals = useMemo(() => computeTotals(rows, currency), [rows, currency])

  const unitName =
    user?.tenantMemberships?.find((m) => m.tenantId === (user.activeTenantId ?? user.tenantId))
      ?.tenantName ?? user?.tenantMemberships?.[0]?.tenantName

  const handleRowsChange = (next: EntryLineRow[]) => {
    // One-total semantics: every line mirrors the total (grid amounts disabled).
    setRows(next.map((row) => ({ ...row, amount })))
  }

  const handleKindChange = (next: "IMPORT" | "EXPORT") => {
    setOffBalanceKind(next)
    // Re-pin every line to the new direction (Nhập → DEBIT, Xuất → CREDIT).
    setRows((prev) =>
      prev.map((row) => ({ ...row, direction: next === "IMPORT" ? "DEBIT" : "CREDIT", pinnedDirection: true })),
    )
  }

  const submit = async () => {
    if (!isValidISODate(accountingDate)) {
      notify.error(t("finance.posting.validation.date_required"))
      return
    }
    if (rows.some((row) => !row.account_code.trim())) {
      notify.error(t("finance.posting.validation.account_required"))
      return
    }
    const amountMajor = parseMoneyInput(amount)
    if (amountMajor === undefined || amountMajor <= 0) {
      notify.error(t("finance.posting.validation.amount_required"))
      return
    }

    setSavePending(true)
    try {
      const amountMinor = toMinor(amountMajor, currency)
      const created = await postingCaseApi.create("OFF_BALANCE", {
        posting_request: {
          idempotency_key: crypto.randomUUID(),
          accounting_date: accountingDate,
          currency_code: currency,
          description,
          lines: rows.map((row, index) => ({
            line_no: index + 1,
            direction: row.direction,
            amount_minor: amountMinor,
            account_code: row.account_code,
            description: row.description || undefined,
          })),
        },
      })
      notify.success(t("finance.posting.off_balance.notify.created", { case_code: created.case_code }))
      navigate("/finance/posting/off-balance")
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.off_balance.notify.create_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <PostingTabsShell
      labels={tabsShellLabels}
      meta={
        <Badge variant="secondary" className="shrink-0">
          {t("finance.posting.control.status_draft")}
        </Badge>
      }
      tabs={[
        {
          id: TAB_INFO,
          label: t("finance.posting.off_balance.tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="off-balance-kind">{t("finance.posting.field.business_type")}</Label>
                    <Select
                      value={offBalanceKind}
                      onValueChange={(value) => handleKindChange(value as "IMPORT" | "EXPORT")}
                    >
                      <SelectTrigger id="off-balance-kind" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMPORT">
                          {t("finance.posting.off_balance.kind_import")}
                        </SelectItem>
                        <SelectItem value="EXPORT">
                          {t("finance.posting.off_balance.kind_export")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="off-balance-amount">{t("finance.posting.field.amount")}</Label>
                    <Input
                      id="off-balance-amount"
                      className="text-right tabular-nums"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setRows((prev) =>
                          prev.map((row) => ({ ...row, amount: e.target.value })),
                        )
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="off-balance-date">{t("finance.posting.field.txn_date")}</Label>
                    <Input
                      id="off-balance-date"
                      type="date"
                      value={accountingDate}
                      onChange={(e) => setAccountingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="off-balance-currency">{t("common.field.currency")}</Label>
                    <Input
                      id="off-balance-currency"
                      className="uppercase"
                      maxLength={3}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 md:col-span-4">
                    <Label htmlFor="off-balance-description">{t("common.field.description")}</Label>
                    <Input
                      id="off-balance-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("finance.posting.placeholder.description")}
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
                labels={labels.shell}
                unit={unitName}
                status={t("finance.posting.control.status_draft")}
                enteredAt={todayISO()}
                enteredBy={user?.displayName || (user?.name ?? "")}
              />
            </div>
          ),
        },
        {
          id: TAB_LINES,
          label: t("finance.posting.off_balance.tab_lines"),
          content: (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">
                  {direction === "DEBIT"
                    ? t("finance.posting.off_balance.pinned_debit")
                    : t("finance.posting.off_balance.pinned_credit")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("finance.posting.off_balance.total")}:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatAmount(
                      fromMinor(
                        direction === "DEBIT" ? totals.totalDebitMinor : totals.totalCreditMinor,
                        currency,
                      ),
                      currency,
                    )}
                  </span>
                </span>
              </div>
              <EntryLinesGrid
                rows={rows}
                onRowsChange={handleRowsChange}
                labels={labels.grid}
                currency={currency}
                canAddRows
                canDeleteRows
                minRows={1}
                lockAmounts
                hideTotals
                accountQuery={{ nature: "B" }}
                fetchAccounts={(params) =>
                  financeApi
                    .listCoaAccounts({ nature: params.extra?.nature as string | undefined })
                    .then((res) => {
                      // COA endpoint is an unpaged lookup; filter postable
                      // rows + q and paginate client-side (small static set).
                      const q = params.q?.trim().toLowerCase()
                      const filtered = res.items.filter(
                        (account) =>
                          account.isPostable &&
                          (!q ||
                            account.accCode.toLowerCase().includes(q) ||
                            account.name.toLowerCase().includes(q)),
                      )
                      const start = (params.page - 1) * params.perPage
                      return {
                        items: filtered
                          .slice(start, start + params.perPage)
                          .map((account) => ({
                            code: account.accCode,
                            name: account.name,
                          })),
                        total: filtered.length,
                      }
                    })
                }
              />
            </div>
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/finance/posting/off-balance")}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            <Save className="mr-1.5 size-4" />
            {savePending ? t("common.action.saving") : t("finance.posting.action.submit")}
          </Button>
        </div>
      }
    />
  )
}

function initialRows(kind: "IMPORT" | "EXPORT"): EntryLineRow[] {
  const direction = kind === "IMPORT" ? "DEBIT" : "CREDIT"
  return [
    newEntryLineRow({ direction, pinnedDirection: true }),
    newEntryLineRow({ direction, pinnedDirection: true }),
  ]
}
