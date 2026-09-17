import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { applyServerListFilters } from "@workspace/list-page/server-list"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { formatDateShort } from "@workspace/format"
import { postingApi, type JournalEntry } from "../api"
import {
  FUND_DOCUMENT_TYPE,
  FUND_TABS,
  fundsListDefinition,
  parseFundTab,
  type FundTab,
} from "./list-query"

const FUND_CODES = [
  "DEV",
  "FIN_RESERVE",
  "OP_SUPPLEMENT",
  "BONUS_MANAGER",
  "BONUS_STAFF",
  "WELFARE_FIXED",
  "WELFARE_BOD",
] as const

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/**
 * Quỹ: trích lập / sử dụng (FIN_FUND_APPROP / FIN_FUND_USE) — server-tier list
 * on the shared journal endpoint. `?tab=` selects the document_type and keeps
 * the tab shareable; page/perPage/sort/order go straight to the BE.
 */
export function FundsPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [fundCode, setFundCode] = useState<string>("DEV")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const columns = useMemo<ColumnDef<JournalEntry>[]>(
    () => [
      {
        id: "entry_no",
        accessorKey: "entry_no",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.journal.field.entry_no")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            JE-{String(row.original.entry_no).padStart(6, "0")}
          </span>
        ),
      },
      {
        id: "accounting_date",
        accessorKey: "accounting_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.journal.field.accounting_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.accounting_date)}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: () => (
          <span className="text-xs font-bold text-foreground">
            {t("finance.journal.field.description")}
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[420px] truncate">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => (
          <span className="text-xs font-bold text-foreground">
            {t("common.field.status")}
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "POSTED" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<JournalEntry>({
    ...fundsListDefinition,
    columns,
    queryFn: async (query) =>
      postingApi.listJournalPaged({
        page: query.page,
        perPage: query.perPage,
        document_type: FUND_DOCUMENT_TYPE[parseFundTab(query.tab)],
        sort: query.sort,
        order: query.order,
      }),
  })

  const tab = parseFundTab(query.tab)

  const selectTab = (next: FundTab) => {
    setSearchParams(
      applyServerListFilters(
        searchParams,
        { tab: next },
        fundsListDefinition.queryConfig
      ),
      { replace: true }
    )
  }

  const submit = async () => {
    const amountMinor = Math.round(Number(amount) * 100)
    if (!fundCode || !amountMinor || amountMinor <= 0) {
      notify.error(t("finance.funds.validation.required"))
      return
    }
    setSaving(true)
    try {
      const res = await postingApi.createFundCase({
        accounting_date: date,
        action: tab,
        fund_code: fundCode,
        amount_minor: amountMinor,
        description: description.trim() || undefined,
      })
      notify.success(t("finance.funds.toast.created", { code: res.case_code }))
      setOpen(false)
      setAmount("")
      setDescription("")
      await refetch()
    } catch (err) {
      notify.error(
        t("finance.funds.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ListPageShell
      title={t("finance.funds.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.funds.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("finance.funds.load_failed")}
      fetching={isFetching}
      table={table}
      header={
        <div className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("finance.funds.description")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {FUND_TABS.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={value === tab ? "default" : "outline"}
                className="h-8 px-3 text-xs font-semibold"
                onClick={() => selectTab(value)}
              >
                {t(`finance.funds.tab.${value}`)}
              </Button>
            ))}
          </div>
        </div>
      }
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setOpen(true)}
          createLabel={
            tab === "APPROPRIATION"
              ? t("finance.funds.action.appropriate")
              : t("finance.funds.action.utilize")
          }
          exportFilename={t("finance.funds.title")}
          sheetName={t("finance.funds.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {tab === "APPROPRIATION"
                  ? t("finance.funds.action.appropriate")
                  : t("finance.funds.action.utilize")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.funds.field.fund")}</Label>
                <Select value={fundCode} onValueChange={setFundCode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {t(`finance.funds.fund.${code}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("finance.funds.field.amount")}
                </Label>
                <Input
                  className="h-8 text-xs"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.funds.field.date")}</Label>
                <Input
                  type="date"
                  className="h-8 w-44 text-xs"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("finance.funds.field.description")}
                </Label>
                <Input
                  className="h-8 text-xs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? t("common.action.saving") : t("common.action.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  )
}
