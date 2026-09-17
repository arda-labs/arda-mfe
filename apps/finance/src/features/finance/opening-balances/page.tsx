import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
import { Plus, RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatMoney, fromMinor, todayISO } from "@workspace/format"
import { postingApi, type OpeningBalance } from "../api"
import { UpsertOpeningBalanceDialog } from "./components/upsert-dialog"

const DEFAULT_PAGE_SIZE = 20

/**
 * Nhập số dư đầu kỳ (Q11 / Q2 migration): list snapshot hiệu lực ≤ as_of +
 * upsert từng dòng theo (kỳ, COA version, tài khoản, loại tiền). BE idempotent
 * theo cùng khóa nên nhập lại chỉ ghi đè giá trị.
 *
 * GET /api/finance/opening-balances trả nguyên mảng (unpaged), nên đây là
 * client-tier list: lọc/sắp xếp/phân trang thật trong bộ nhớ, URL-synced
 * (`as_of` + page/perPage/sort/filter) qua useClientListTable.
 */
export function OpeningBalancesPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const asOf = searchParams.get("as_of") || todayISO()
  const [items, setItems] = useState<OpeningBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async (date: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await postingApi.listOpeningBalances(date)
      setItems(res)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(asOf)
  }, [asOf, load])

  const changeAsOf = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set("as_of", value)
    else next.delete("as_of")
    next.set("page", "1")
    setSearchParams(next, { replace: true })
  }

  const columns = useMemo<ColumnDef<OpeningBalance>[]>(
    () => [
      {
        id: "date",
        accessorKey: "accounting_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.accounting_date}</span>
        ),
      },
      {
        id: "version",
        accessorKey: "coa_version",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.version")}
          />
        ),
        cell: ({ row }) => <span>{row.original.coa_version || "—"}</span>,
      },
      {
        id: "account",
        accessorKey: "account_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.account")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("finance.opening_balances.col.account"),
          t("finance.opening_balances.placeholder.account")
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{row.original.account_code}</span>
        ),
      },
      {
        id: "currency",
        accessorKey: "currency_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.currency")}
          />
        ),
        cell: ({ row }) => <span>{row.original.currency_code}</span>,
      },
      {
        id: "direction",
        accessorKey: "direction",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.direction")}
          />
        ),
        cell: ({ row }) => (
          <span>
            {t(`finance.opening_balances.direction.${row.original.direction}`)}
          </span>
        ),
      },
      {
        id: "amount",
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <div className="flex justify-end">
            <DataTableColumnHeader
              column={column}
              label={t("finance.opening_balances.col.amount")}
            />
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatMoney(fromMinor(row.original.amount_minor, row.original.currency_code))}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="block max-w-64 truncate" title={row.original.description}>
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "source",
        accessorKey: "source_key",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.opening_balances.col.source")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.source_key || "—"}</span>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<OpeningBalance>({
    columns,
    items,
    filterBy: {
      account: (item, value) =>
        matchTextColumnFilter(value, item.account_code, item.description),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        date: (a, b) => a.accounting_date.localeCompare(b.accounting_date),
        version: (a, b) => a.coa_version.localeCompare(b.coa_version),
        account: (a, b) => a.account_code.localeCompare(b.account_code),
        currency: (a, b) => a.currency_code.localeCompare(b.currency_code),
        direction: (a, b) => a.direction.localeCompare(b.direction),
        amount: (a, b) => a.amount_minor - b.amount_minor,
        description: (a, b) => a.description.localeCompare(b.description),
        source: (a, b) => a.source_key.localeCompare(b.source_key),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("finance.opening_balances.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("finance.opening_balances.count_badge", { count: total })}
        </Badge>
      }
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void load(asOf)}
          >
            <RefreshCw className="size-4" />
            {t("finance.opening_balances.refresh")}
          </Button>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("finance.opening_balances.add")}
          </Button>
        </>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(asOf)}
      loadErrorTitle={t("finance.opening_balances.load_failed")}
      table={table}
      header={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48 space-y-1.5">
            <Label htmlFor="ob-as-of">
              {t("finance.opening_balances.field.as_of")}
            </Label>
            <Input
              id="ob-as-of"
              type="date"
              value={asOf}
              onChange={(event) => changeAsOf(event.target.value)}
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            {t("finance.opening_balances.as_of_hint")}
          </p>
        </div>
      }
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("finance.opening_balances.title")}
          sheetName={t("finance.opening_balances.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <UpsertOpeningBalanceDialog
          open={dialogOpen}
          defaultDate={asOf}
          onOpenChange={setDialogOpen}
          onSaved={() => {
            setDialogOpen(false)
            void load(asOf)
          }}
        />
      }
    />
  )
}
