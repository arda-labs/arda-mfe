import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw, Save } from "lucide-react"
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
import { formatAmount, formatDateShort, fromMinor, isValidISODate, todayISO } from "@workspace/format"
import { closingApi, postingCaseApi, type ClosingAccountRow, type ClosingPeriodType } from "../api"
import {
  useObjectInfoLabels,
  useObjectTypeOptions,
  usePostingFlowLabels,
  usePostingTabsLabels,
} from "./labels"
import { ClosingAccountsTable } from "./closing/accounts-table"
import { CLOSING_PERIOD_LABEL_KEYS, computeClosingTotals, periodEndISO } from "./closing/period"

const TAB_INFO = "closing-info"
const TAB_ACCOUNTS = "closing-accounts"

const CLOSING_PERIODS: ClosingPeriodType[] = ["D", "M", "Q", "Y"]

/**
 * Kết chuyển thu chi (FAC.203.01) on the CRM-style PostingTabsShell. Tab 1
 * holds the period (Kỳ kết chuyển) + accounting date (defaults to the
 * period end) + computed results (Kết quả kinh doanh / Tổng thu / Tổng chi)
 * + description + object info; tab 2 is the READ-ONLY closable account
 * table (every row closes at its balance — EPAS has no selection). Changing
 * period or date reloads the accounts once both are set. Submit creates a
 * CLOSING case; the BE builds the bút toán — the FE sends rows only.
 */
export function ClosingFormPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const labels = usePostingFlowLabels()
  const tabsShellLabels = usePostingTabsLabels("finance.posting.closing.init_title")
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()

  const [periodType, setPeriodType] = useState<ClosingPeriodType>("Y")
  const [accountingDate, setAccountingDate] = useState(() => periodEndISO("Y"))
  const [description, setDescription] = useState("")
  const [rows, setRows] = useState<ClosingAccountRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
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

  const loadAccounts = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const result = await closingApi.accounts(date)
      setRows(result.items)
      setLoaded(true)
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.closing.notify.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload accounts whenever period or date changes — but only once both are
  // usable (a valid ISO date; the period select always has a value).
  useEffect(() => {
    if (isValidISODate(accountingDate)) void loadAccounts(accountingDate)
  }, [accountingDate, loadAccounts])

  const handlePeriodChange = (next: ClosingPeriodType) => {
    setPeriodType(next)
    // Reset the date to the new period's end — the user can still override it.
    setAccountingDate(periodEndISO(next))
  }

  const handleDateChange = (next: string) => {
    setAccountingDate(next)
  }

  // Auto-fill "Kết chuyển thu chi kỳ <kỳ> — <ngày>" on mount and on every
  // period/date change — user edits always win (skipped when non-auto).
  const lastAutoDescriptionRef = useRef<string | null>(null)
  useEffect(() => {
    const auto = t("finance.posting.closing.description_auto", {
      period: t(CLOSING_PERIOD_LABEL_KEYS[periodType]),
      date: formatDateShort(accountingDate),
    })
    const previous = lastAutoDescriptionRef.current
    if (description.trim() && description !== previous) return
    lastAutoDescriptionRef.current = auto
    setDescription(auto)
  }, [periodType, accountingDate, description, t])

  const totals = useMemo(() => computeClosingTotals(rows), [rows])

  const submit = async () => {
    if (!isValidISODate(accountingDate)) {
      notify.error(t("finance.posting.validation.date_required"))
      return
    }
    if (rows.length === 0) {
      notify.error(t("finance.posting.closing.validation.rows_required"))
      return
    }

    setSavePending(true)
    try {
      const created = await postingCaseApi.create("CLOSING", {
        closing_request: {
          idempotency_key: crypto.randomUUID(),
          accounting_date: accountingDate,
          period_type: periodType,
          description: description || undefined,
          trader: {
            object_type: trader.object_type,
            object_code: trader.object_code || undefined,
            object_name: trader.object_name || undefined,
            id_number: trader.id_number || undefined,
            issue_date: trader.issue_date || undefined,
            issue_place: trader.issue_place || undefined,
            address: trader.address || undefined,
          },
          rows: rows.map((row) => ({
            acc_code: row.acc_code,
            acc_purpose: row.acc_purpose,
            amount_minor: row.closing_amount_minor,
          })),
        },
      })
      notify.success(t("finance.posting.closing.notify.created", { case_code: created.case_code }))
      navigate("/finance/posting/closing")
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.closing.notify.create_failed"))
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
          label: t("finance.posting.closing.tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="closing-period">{t("finance.posting.closing.period")}</Label>
                    <Select value={periodType} onValueChange={(value) => handlePeriodChange(value as ClosingPeriodType)}>
                      <SelectTrigger id="closing-period" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLOSING_PERIODS.map((period) => (
                          <SelectItem key={period} value={period}>
                            {t(CLOSING_PERIOD_LABEL_KEYS[period])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="closing-date">{t("finance.posting.field.txn_date")}</Label>
                    <Input
                      id="closing-date"
                      type="date"
                      value={accountingDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="closing-total-income">
                      {t("finance.posting.closing.total_income")}
                    </Label>
                    <p
                      id="closing-total-income"
                      className="rounded-md border border-input bg-muted/40 px-3 py-2 text-right text-sm tabular-nums"
                    >
                      {formatAmount(fromMinor(totals.incomeMinor), "VND")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="closing-total-expense">
                      {t("finance.posting.closing.total_expense")}
                    </Label>
                    <p
                      id="closing-total-expense"
                      className="rounded-md border border-input bg-muted/40 px-3 py-2 text-right text-sm tabular-nums"
                    >
                      {formatAmount(fromMinor(totals.expenseMinor), "VND")}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="closing-result">
                      {t("finance.posting.closing.business_result")}
                    </Label>
                    <p
                      id="closing-result"
                      className={`rounded-md border px-3 py-2 text-right text-sm font-semibold tabular-nums ${
                        totals.resultMinor >= 0
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {formatAmount(fromMinor(totals.resultMinor), "VND")}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="closing-description">{t("common.field.description")}</Label>
                    <Input
                      id="closing-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("finance.posting.closing.placeholder.description")}
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
          id: TAB_ACCOUNTS,
          label: t("finance.posting.closing.tab_accounts"),
          content: (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("finance.posting.closing.accounts_hint")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !isValidISODate(accountingDate)}
                  onClick={() => void loadAccounts(accountingDate)}
                >
                  <RefreshCw className="mr-1 size-3.5" />
                  {t("finance.posting.closing.get_data")}
                </Button>
              </div>
              <ClosingAccountsTable rows={rows} isLoading={loading} loaded={loaded} />
            </div>
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/finance/posting/closing")}>
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
