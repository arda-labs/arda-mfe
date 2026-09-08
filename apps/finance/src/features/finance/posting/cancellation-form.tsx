import { useMemo, useState } from "react"
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
import { ChooseTransactionDialog, formatEntryNo } from "@workspace/posting-flow/choose-transaction-dialog"
import type { ObjectInfoValue, TransactionOption } from "@workspace/posting-flow/types"
import { formatDateShort, formatAmount, fromMinor, isValidISODate, todayISO } from "@workspace/format"
import {
  journalEntryApi,
  postingCaseApi,
  type JournalEntryDetail,
} from "../api"
import {
  useChooseTransactionLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
  usePostingFlowLabels,
  usePostingTabsLabels,
} from "./labels"
import { OriginalEntryLines } from "./original-entry-lines"

const TAB_INFO = "transaction-info"
const TAB_ORIGINAL = "original-entries"

/**
 * Cancellation init form (FAC.300.01, Hủy giao dịch) on the CRM-style
 * PostingTabsShell. No bút toán entry: the user picks the original journal
 * entry (ChooseTransactionDialog), its lines render read-only on tab 2 and a
 * summary (Người giao dịch / Ngày / Số tiền / Trạng thái) on tab 1. Submit
 * creates a case with flow CANCELLATION — the BE stamps FIN_TXN_CANCEL on the
 * reversal record and routes it to the workbench.
 */
export function CancellationFormPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const labels = usePostingFlowLabels()
  const tabsShellLabels = usePostingTabsLabels("finance.posting.cancellation.init_title")
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const dialogLabels = useChooseTransactionLabels()

  const [accountingDate, setAccountingDate] = useState(() => todayISO())
  const [reason, setReason] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reference, setReference] = useState<TransactionOption | null>(null)
  const [detail, setDetail] = useState<JournalEntryDetail | null>(null)
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

  const summaryAmountMinor = useMemo(() => {
    if (detail?.total_amount_minor !== undefined) return detail.total_amount_minor
    if (!detail) return undefined
    return detail.lines.reduce((sum, line) => Math.max(sum, Math.abs(line.amount_minor)), 0)
  }, [detail])

  const selectTransaction = async (entry: TransactionOption) => {
    setDialogOpen(false)
    setReference(entry)
    setDetail(null)
    setDetailPending(true)
    try {
      setDetail(await journalEntryApi.detail(entry.entry_no))
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.cancellation.notify.detail_failed"))
    } finally {
      setDetailPending(false)
    }
  }

  const submit = async () => {
    if (!isValidISODate(accountingDate)) {
      notify.error(t("finance.posting.validation.date_required"))
      return
    }
    if (!reference) {
      notify.error(t("finance.posting.cancellation.validation.reference_required"))
      return
    }
    if (!reason.trim()) {
      notify.error(t("finance.posting.cancellation.validation.reason_required"))
      return
    }

    setSavePending(true)
    try {
      const created = await postingCaseApi.create("CANCELLATION", {
        cancellation_request: {
          idempotency_key: crypto.randomUUID(),
          reference_entry_no: reference.entry_no,
          reason,
          accounting_date: accountingDate,
          trader: {
            object_type: trader.object_type,
            object_code: trader.object_code || undefined,
            object_name: trader.object_name || undefined,
            id_number: trader.id_number || undefined,
            issue_date: trader.issue_date || undefined,
            issue_place: trader.issue_place || undefined,
            address: trader.address || undefined,
          },
        },
      })
      notify.success(t("finance.posting.cancellation.notify.created", { case_code: created.case_code }))
      navigate("/finance/posting/cancellation")
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.cancellation.notify.create_failed"))
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
          label: t("finance.posting.cancellation.tab_info"),
          content: (
            <div className="space-y-4">
              <ChooseTransactionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                fetchTransactions={fetchJournalEntriesPaged}
                documentTypes={[
                  { value: "FIN_SINGLE_ENTRY", label: t("finance.posting.single.title") },
                  { value: "FIN_DOUBLE_ENTRY", label: t("finance.posting.double.title") },
                  { value: "FIN_OFF_BALANCE", label: t("finance.posting.off_balance.title") },
                ]}
                onSelect={(entry) => void selectTransaction(entry)}
                labels={dialogLabels}
              />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>{t("finance.posting.field.business_type")}</Label>
                  <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {t("finance.posting.cancellation.business_type")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cancellation-date">{t("finance.posting.field.txn_date")}</Label>
                  <Input
                    id="cancellation-date"
                    type="date"
                    value={accountingDate}
                    onChange={(e) => setAccountingDate(e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="cancellation-reference">
                    {t("finance.posting.cancellation.reference_label")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="cancellation-reference"
                      readOnly
                      value={
                        reference
                          ? `${formatEntryNo(reference.entry_no)}${reference.description ? ` — ${reference.description}` : ""}`
                          : ""
                      }
                      placeholder={t("finance.posting.cancellation.reference_placeholder")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      aria-label={t("finance.posting.cancellation.reference_label")}
                      onClick={() => setDialogOpen(true)}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5 md:col-span-4">
                  <Label htmlFor="cancellation-reason">{t("common.field.description")}</Label>
                  <Input
                    id="cancellation-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("finance.posting.cancellation.placeholder.reason")}
                  />
                </div>
              </div>

              {reference ? (
                <dl className="grid gap-x-6 gap-y-2 rounded-md border px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryField
                    label={t("finance.posting.cancellation.summary_trader")}
                    value={
                      detailPending
                        ? "…"
                        : (detail?.trader?.object_name ??
                          t("finance.posting.cancellation.summary_unknown"))
                    }
                  />
                  <SummaryField
                    label={t("finance.posting.cancellation.summary_date")}
                    value={formatDateShort(reference.accounting_date)}
                  />
                  <SummaryField
                    label={t("finance.posting.cancellation.summary_amount")}
                    value={formatSummaryAmount(summaryAmountMinor, detail?.currency_code)}
                  />
                  <SummaryField
                    label={t("finance.posting.cancellation.summary_status")}
                    value={detail?.status ?? reference.status ?? "—"}
                  />
                </dl>
              ) : null}

              <div className="grid items-start gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
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
            </div>
          ),
        },
        {
          id: TAB_ORIGINAL,
          label: t("finance.posting.cancellation.tab_original"),
          content: <OriginalEntryLines detail={detail} isLoading={detailPending} />,
        },
      ]}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/finance/posting/cancellation")}>
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

/** module-scope adapter — keeps the JSX above free of per-render closures. */
function fetchJournalEntriesPaged(params: {
  document_type?: string
  from_date?: string
  to_date?: string
  q?: string
  page: number
  perPage: number
}) {
  return journalEntryApi
    .paged({
      document_type: params.document_type,
      from_date: params.from_date,
      to_date: params.to_date,
      q: params.q,
      page: params.page,
      perPage: params.perPage,
    })
    .then((res) => ({ items: res.items, total: res.total }))
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium">{value || "—"}</dd>
    </div>
  )
}

function formatSummaryAmount(minor: number | undefined, currency?: string): string {
  if (minor === undefined) return "—"
  return formatAmount(fromMinor(minor, currency ?? "VND"), currency ?? "VND")
}

