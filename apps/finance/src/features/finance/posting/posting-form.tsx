import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { notify } from "@workspace/ui/feedback/notify"
import { attachStagedCaseFiles, useStagedAttachments } from "@workspace/case-tabs"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  DetailCard,
  PostingTabsShell,
  ControlInfoCard,
} from "@workspace/posting-flow/posting-flow-shell"
import {
  EntryLinesGrid,
} from "@workspace/posting-flow/entry-lines-grid"
import {
  computeTotals,
  newEntryLineRow,
} from "@workspace/posting-flow/entry-lines"
import { PostingPreviewPanel } from "@workspace/posting-flow/posting-preview-panel"
import type { EntryLineRow } from "@workspace/posting-flow/types"
import { formatAmount, fromMinor, isValidISODate, parseMoneyInput, todayISO, toMinor } from "@workspace/format"
import { financeApi, postingApi, postingCaseApi, type PostingFlow } from "../api"
import { usePostingFlowLabels } from "./labels"

const FLOW_DOCUMENT_TYPE: Record<PostingFlow, string> = {
  SINGLE_ENTRY: "FIN_SINGLE_ENTRY",
  DOUBLE_ENTRY: "FIN_DOUBLE_ENTRY",
  OFF_BALANCE: "FIN_OFF_BALANCE",
  CANCELLATION: "FIN_TXN_CANCEL",
  CLOSING: "FIN_CLOSING",
}

const FLOW_LIST_PATH: Record<PostingFlow, string> = {
  SINGLE_ENTRY: "/finance/posting/single-entry",
  DOUBLE_ENTRY: "/finance/posting/double-entry",
  OFF_BALANCE: "/finance/posting/off-balance",
  CANCELLATION: "/finance/posting/cancellation",
  CLOSING: "/finance/posting/closing",
}

function initialRows(flow: PostingFlow): EntryLineRow[] {
  if (flow === "SINGLE_ENTRY") {
    return [
      newEntryLineRow({ direction: "DEBIT", pinnedDirection: true }),
      newEntryLineRow({ direction: "CREDIT", pinnedDirection: true }),
    ]
  }
  return [newEntryLineRow(), newEntryLineRow()]
}

const MANUAL_FLOWS: PostingFlow[] = ["SINGLE_ENTRY", "DOUBLE_ENTRY"]

/**
 * Posting-case init form (FAC bút toán lẻ / bút toán kép) on the shared
 * posting-flow shell. SINGLE_ENTRY pins exactly 2 rows (Nợ/Có) driven by one
 * amount; DOUBLE_ENTRY allows free rows and submits only when balanced.
 * Submit creates a posting case via POST /api/finance/posting-cases — the
 * BE re-validates structure and routes the case to the workbench inbox.
 */
export function PostingCaseInitPage({ flow }: { flow: PostingFlow }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const labels = usePostingFlowLabels()
  const staged = useStagedAttachments({ module: "finance" })

  const [accountingDate, setAccountingDate] = useState(() => todayISO())
  const [currency, setCurrency] = useState("VND")
  const [description, setDescription] = useState("")
  const [rows, setRows] = useState<EntryLineRow[]>(() => initialRows(flow))
  const [savePending, setSavePending] = useState(false)

  const single = flow === "SINGLE_ENTRY"
  const manual = MANUAL_FLOWS.includes(flow)
  const documentType = FLOW_DOCUMENT_TYPE[flow]
  const totals = useMemo(() => computeTotals(rows, currency), [rows, currency])

  const handleRowsChange = (next: EntryLineRow[]) => {
    if (single) {
      // Single-amount semantics: both pinned lines stay in lockstep.
      const amount = next[0]?.amount ?? ""
      setRows(next.map((row) => ({ ...row, amount })))
      return
    }
    setRows(next)
  }

  const unitName =
    user?.tenantMemberships?.find((m) => m.tenantId === (user.activeTenantId ?? user.tenantId))
      ?.tenantName ?? user?.tenantMemberships?.[0]?.tenantName

  const submit = async () => {
    if (!isValidISODate(accountingDate)) {
      notify.error(t("finance.posting.validation.date_required"))
      return
    }
    if (rows.some((row) => !row.account_code.trim())) {
      notify.error(t("finance.posting.validation.account_required"))
      return
    }
    const amounts = rows.map((row) => parseMoneyInput(row.amount) ?? 0)
    if (amounts.some((amount) => amount <= 0)) {
      notify.error(t("finance.posting.validation.amount_required"))
      return
    }
    if (manual && !single && !totals.balanced) {
      notify.error(t("finance.posting.validation.not_balanced"))
      return
    }

    setSavePending(true)
    try {
      const created = await postingCaseApi.create(flow, {
        posting_request: {
          idempotency_key: crypto.randomUUID(),
          accounting_date: accountingDate,
          currency_code: currency,
          description,
          lines: rows.map((row, index) => ({
            line_no: index + 1,
            direction: row.direction,
            amount_minor: toMinor(parseMoneyInput(row.amount) ?? 0, currency),
            account_code: row.account_code,
            description: row.description || undefined,
          })),
        },
      })
      try {
        await attachStagedCaseFiles(staged.ids, created.case_id)
      } catch (error) {
        notify.error(
          translateApiError(error, "finance.posting.notify.attach_failed")
        )
      }
      notify.success(t("finance.posting.notify.created", { case_code: created.case_code }))
      navigate(FLOW_LIST_PATH[flow])
    } catch (error) {
      notify.error(translateApiError(error, "finance.posting.notify.create_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <PostingTabsShell
      labels={{
        title: t(
          flow === "SINGLE_ENTRY"
            ? "finance.posting.single.init_title"
            : flow === "DOUBLE_ENTRY"
              ? "finance.posting.double.init_title"
              : "",
        ),
      }}
      meta={
        <Badge variant="secondary" className="shrink-0">
          {t("finance.posting.control.status_draft")}
        </Badge>
      }
      tabs={[
        {
          id: "posting-info",
          label: t("finance.posting.group.transaction_info"),
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid items-start gap-4 lg:grid-cols-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:col-span-2">
                <div className="space-y-1.5">
                  <Label>{t("finance.posting.field.business_type")}</Label>
                  <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {t(
                      single
                        ? "finance.posting.single.business_type"
                        : "finance.posting.double.business_type",
                    )}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="posting-date">{t("finance.posting.field.txn_date")}</Label>
                  <Input
                    id="posting-date"
                    type="date"
                    value={accountingDate}
                    onChange={(e) => setAccountingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="posting-currency">{t("common.field.currency")}</Label>
                  <Input
                    id="posting-currency"
                    className="uppercase"
                    maxLength={3}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  />
                </div>
                {single ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="posting-amount">{t("finance.posting.field.amount")}</Label>
                    <Input
                      id="posting-amount"
                      className="text-right tabular-nums"
                      inputMode="decimal"
                      value={rows[0]?.amount ?? ""}
                      onChange={(e) => handleRowsChange(rows.map((row) => ({ ...row, amount: e.target.value })))}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>{t("common.field.status")}</Label>
                    <p className="flex items-center gap-2 px-3 py-2 text-sm">
                      <Badge variant={totals.balanced ? "default" : "destructive"}>
                        {totals.balanced
                          ? t("finance.posting.balanced")
                          : t("finance.posting.not_balanced")}
                      </Badge>
                    </p>
                  </div>
                )}
                <div className="col-span-2 space-y-1.5 md:col-span-4">
                  <Label htmlFor="posting-description">{t("common.field.description")}</Label>
                  <Input
                    id="posting-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("finance.posting.placeholder.description")}
                  />
                </div>
                </div>
                <ControlInfoCard
                  labels={labels.shell}
                  unit={unitName}
                  status={t("finance.posting.control.status_draft")}
                  enteredAt={todayISO()}
                  enteredBy={user?.displayName || user?.name}
                />
              </div>
              <DetailCard
                title={t("finance.posting.group.detail_lines")}
                actions={
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {t("finance.posting.total_debit")}:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatAmount(fromMinor(totals.totalDebitMinor, currency), currency)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {t("finance.posting.total_credit")}:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatAmount(fromMinor(totals.totalCreditMinor, currency), currency)}
                      </span>
                    </span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <EntryLinesGrid
                    rows={rows}
                    onRowsChange={handleRowsChange}
                    labels={labels.grid}
                    currency={currency}
                    canAddRows={!single}
                    canDeleteRows={!single}
                    minRows={2}
                    fetchAccounts={(params) =>
                      financeApi
                        .listAccountsPaged({ q: params.q, page: params.page, perPage: params.perPage })
                        .then((res) => ({
                          items: res.items.map((account) => ({
                            code: account.code,
                            name: account.name,
                            currency: account.currency,
                            isActive: account.isActive,
                          })),
                          total: res.total,
                        }))
                    }
                  />
                  <PostingPreviewPanel
                    accountingDate={accountingDate}
                    currency={currency}
                    documentType={documentType}
                    rows={rows}
                    validate={postingApi.validate}
                    labels={labels.preview}
                  />
                </div>
              </DetailCard>
            </div>
          ),
        },
        staged.tab,
      ]}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => navigate(FLOW_LIST_PATH[flow])}>
            <ArrowLeft className="mr-1 size-3.5" />
            {t("common.action.back")}
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
