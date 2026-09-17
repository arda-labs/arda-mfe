import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { statisticalApi, type ScoreResult } from "../api"
import { ScoreCalculator } from "./components/ScoreCalculator"

const DEFAULT_PAGE_SIZE = 10

/**
 * Rank-score runtime (fe_statistical #19): the calculator (indicator entries +
 * weights + benchmark bands) sits in the shell `header` slot, scrollable so
 * the ranking table keeps room. Results are a client-tier list — the endpoint
 * returns the full set, so search/sort/paging run in memory and stay
 * URL-synced via useClientListTable.
 */
export function ScoringPage() {
  const { t, formatDate } = useI18n()
  const [results, setResults] = useState<ScoreResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      setResults(await statisticalApi.listScoreResults())
    } catch (reason) {
      setResults([])
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const columns = useMemo<ColumnDef<ScoreResult>[]>(
    () => [
      {
        id: "scoring_type_code",
        accessorKey: "scoring_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.scoring.col.type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("statistical.scoring.col.type"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.scoring_type_code}
          </span>
        ),
      },
      {
        id: "subject_ref",
        accessorKey: "subject_ref",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.scoring.col.subject")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs">{row.original.subject_ref || "—"}</span>
        ),
      },
      {
        id: "total_score",
        accessorKey: "total_score",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.scoring.col.score")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {row.original.total_score}
          </span>
        ),
      },
      {
        id: "rank_code",
        accessorKey: "rank_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.scoring.col.rank")}
          />
        ),
        cell: ({ row }) =>
          row.original.rank_code ? (
            <Badge variant="secondary">{row.original.rank_code}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
    ],
    [formatDate, t]
  )

  const { table, total } = useClientListTable<ScoreResult>({
    columns,
    items: results,
    filterBy: {
      scoring_type_code: (item, value) =>
        matchTextColumnFilter(value, item.scoring_type_code, item.subject_ref),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        scoring_type_code: (a, b) =>
          a.scoring_type_code.localeCompare(b.scoring_type_code),
        subject_ref: (a, b) =>
          (a.subject_ref ?? "").localeCompare(b.subject_ref ?? ""),
        total_score: (a, b) => a.total_score - b.total_score,
        rank_code: (a, b) => (a.rank_code ?? "").localeCompare(b.rank_code ?? ""),
        created_at: (a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("statistical.scoring.title")}
      header={
        <div className="flex max-h-[55vh] shrink-0 flex-col gap-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("statistical.scoring.description")}
          </p>
          <ScoreCalculator onComputed={() => load()} />
        </div>
      }
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("statistical.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      loadErrorTitle={t("statistical.scoring.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("statistical.scoring.results")}
          sheetName={t("statistical.scoring.results")}
          totalRowsCount={total}
        />
      }
    />
  )
}
