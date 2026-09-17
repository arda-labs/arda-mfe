import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Spinner } from "@workspace/ui/components/spinner"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import type { AccountingConfigItem } from "./api"
import { financeOperationApi } from "./api"

const GROUPS = [
  "process",
  "classification",
  "journal",
  "regulatory",
  "internal",
] as const

type Group = (typeof GROUPS)[number]

function parseGroup(value: string | null): Group {
  return GROUPS.find((group) => group === value) ?? "process"
}

/** Accounting configuration: process mappings, classifications, journal
 * definitions, named accounts. Legacy incoming/outgoing transaction UI was
 * removed in the Phase 0 rebuild — posting is journal-first (PostingService).
 *
 * The five BE endpoints are unpaged reference lists, so each tab is a
 * client-tier list (filter/sort/paging in memory, `?tab=` URL-synced). */
export function AccountingConfigPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState<{ items: AccountingConfigItem[] }>({
    items: [],
  })
  const [loading, setLoading] = useState(true)
  const tab = parseGroup(searchParams.get("tab"))

  useEffect(() => {
    let cancelled = false
    void financeOperationApi
      .listAccountingConfig()
      .then((nextResult) => {
        if (!cancelled) setResult(nextResult)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const items = result?.items ?? []

  const selectTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    next.delete("page")
    next.delete("sort")
    next.delete("code")
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">
          {t("finance.operation.title")}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("finance.operation.description")}
        </p>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <Tabs value={tab} onValueChange={selectTab} className="space-y-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {GROUPS.map((group) => (
              <TabsTrigger key={group} value={group}>
                {t(`finance.operation.tab.${group}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {GROUPS.map((group) => (
            <TabsContent key={group} value={group}>
              <AccountingConfigTable
                items={items.filter((item) => item.group === group)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

function AccountingConfigTable({ items }: { items: AccountingConfigItem[] }) {
  const { t, formatDate } = useI18n()

  const columns = useMemo<ColumnDef<AccountingConfigItem>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.operation.col.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("finance.operation.col.code"),
          t("finance.operation.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.operation.col.name")}
          />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.operation.col.owner")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.owner}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.operation.col.status")}
          />
        ),
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.operation.col.updated")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.updatedAt, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
    ],
    [formatDate, t]
  )

  const { table, total } = useClientListTable<AccountingConfigItem>({
    columns,
    items,
    filterBy: {
      code: (item, value) =>
        matchTextColumnFilter(value, item.code, item.name),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        owner: (a, b) => a.owner.localeCompare(b.owner),
        status: (a, b) => a.status.localeCompare(b.status),
        updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      }),
    defaultPageSize: 10,
  })

  if (!items.length) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        {t("finance.operation.empty")}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <ListTableToolbar
        table={table}
        exportFilename={t("finance.operation.title")}
        sheetName={t("finance.operation.title")}
        totalRowsCount={total}
      />
      <DataTable table={table} totalRows={total} />
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="flex justify-center rounded-lg border p-8">
      <Spinner className="size-6" />
    </div>
  )
}
