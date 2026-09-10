import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import { depositApi, type Savings } from "../api"
import { OpenSavingsDialog } from "./components/OpenSavingsDialog"
import { DepositAdditionalDialog } from "./components/DepositAdditionalDialog"

const DEFAULT_PAGE_SIZE = 10

/** Savings — citizen deposit accounts (DPM): list + open + settle. */
export function SavingsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<Savings[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [settleTarget, setSettleTarget] = useState<Savings | null>(null)
  const [depositTarget, setDepositTarget] = useState<Savings | null>(null)
  const [settling, setSettling] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await depositApi.listSavings()
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const settle = useCallback(
    async (item: Savings) => {
      setSettling(true)
      try {
        const submission = await depositApi.settleSavings(item.savings_code)
        notify.success(
          t("deposit.savings.settle_submitted"),
          submission.case_code
        )
        setSettleTarget(null)
        await load()
      } catch (error) {
        notify.error(
          t("deposit.savings.settle_failed"),
          translateApiError(error, t("deposit.action_failed"))
        )
      } finally {
        setSettling(false)
      }
    },
    [load, t]
  )

  const columns = useMemo<ColumnDef<Savings>[]>(
    () => [
      {
        id: "savings_code",
        accessorKey: "savings_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.savings_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.savings.field.savings_code"),
          t("deposit.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.savings_code}</span>
        ),
      },
      {
        id: "customer_code",
        accessorKey: "customer_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.customer")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.savings.field.customer"),
          t("deposit.placeholder.search")
        ),
      },
      {
        id: "product_code",
        accessorKey: "product_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.product")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.product_code}</span>
        ),
      },
      {
        id: "principal_minor",
        accessorKey: "principal_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.principal")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.principal_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "accrued_minor",
        accessorKey: "accrued_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.accrued")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(fromMinor(row.original.accrued_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "open_date",
        accessorKey: "open_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.open_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.open_date)}</span>
        ),
      },
      {
        id: "maturity_date",
        accessorKey: "maturity_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.savings.field.maturity_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.maturity_date)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          row.original.status === "ACTIVE" ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setDepositTarget(row.original)}
              >
                {t("deposit.savings.deposit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSettleTarget(row.original)}
              >
                {t("deposit.savings.settle")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      savings_code: (item, value) => matchTextColumnFilter(value, item.savings_code),
      customer_code: (item, value) => matchTextColumnFilter(value, item.customer_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        savings_code: (a, b) => a.savings_code.localeCompare(b.savings_code),
        customer_code: (a, b) => a.customer_code.localeCompare(b.customer_code),
        open_date: (a, b) => a.open_date.localeCompare(b.open_date),
        maturity_date: (a, b) => a.maturity_date.localeCompare(b.maturity_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("deposit.savings.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("deposit.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setOpenDialog(true)}
          createLabel={t("deposit.savings.open")}
          exportFilename={t("deposit.savings.title")}
          sheetName={t("deposit.savings.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <OpenSavingsDialog
            open={openDialog}
            onOpenChange={setOpenDialog}
            onSaved={() => load()}
          />
          <DepositAdditionalDialog
            open={depositTarget !== null}
            savingsCode={depositTarget?.savings_code ?? ""}
            onOpenChange={(nextOpen) => !nextOpen && setDepositTarget(null)}
            onSubmitted={() => load()}
          />
          <AlertDialog
            open={settleTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setSettleTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deposit.savings.settle_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deposit.savings.settle_confirm_description", {
                    code: settleTarget?.savings_code ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={settling}
                  onClick={() => settleTarget && void settle(settleTarget)}
                >
                  {t("deposit.savings.settle")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
