import { APP_TIMEZONE } from "@workspace/format"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Eye, Plus, RefreshCw, Trash2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { notify } from "@workspace/ui/feedback/notify"
import { fetchPlatformDrafts } from "./drafts/sources"
import { customerDraftApi } from "./drafts/customer-client"
import type {
  PlatformDraft,
  PlatformDraftDomain,
  PlatformDraftsResult,
} from "./drafts/types"
import { navigateTo } from "./utils/nav"

/** Source domains of the aggregated draft list. */
const DRAFT_DOMAINS: PlatformDraftDomain[] = [
  "crm_customer_registration",
  "finance_incoming",
  "finance_outgoing",
  "hrm_employee_registration",
]

const DRAFT_STATUSES: PlatformDraft["displayStatus"][] = [
  "DRAFT",
  "NEEDS_CHANGES",
]

const DRAFTS_PAGE_SIZE = 25

const createActions: { domain: PlatformDraftDomain; href: string }[] = [
  {
    domain: "crm_customer_registration",
    href: "/customers/registrations",
  },
  {
    domain: "finance_incoming",
    href: "/finance/transactions",
  },
  {
    domain: "finance_outgoing",
    href: "/finance/transactions",
  },
  {
    domain: "hrm_employee_registration",
    href: "/hrm/registrations",
  },
]

export function DraftWorkbenchPage() {
  const { t } = useI18n()
  const [deleteTarget, setDeleteTarget] = useState<PlatformDraft | null>(null)
  const [result, setResult] = useState<PlatformDraftsResult>({
    items: [],
    errors: {},
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setFetchError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      setResult(await fetchPlatformDrafts())
    } catch (reason) {
      setFetchError(reason)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const allItems = result.items
  const sourceErrors = result.errors ?? {}
  const partialLoadFailed = Object.keys(sourceErrors).length > 0

  const criticalPending = loading && !hasLoadedRef.current

  const columns = useMemo<ColumnDef<PlatformDraft>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.workbench.drafts.col_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.workbench.drafts.col_code"),
          t("workflow.workbench.drafts.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.workbench.drafts.col_title")}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            {row.original.subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.subtitle}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "domain",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.workbench.drafts.col_domain")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("workflow.workbench.drafts.filter_domain"),
          DRAFT_DOMAINS.map((domain) => ({
            value: domain,
            label: t(`workflow.workbench.drafts.domain_${domain}`),
          }))
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{domainLabel(row.original.domain, t)}</Badge>
        ),
      },
      {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.workbench.drafts.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("workflow.workbench.drafts.filter_status"),
          DRAFT_STATUSES.map((status) => ({
            value: status,
            label:
              status === "NEEDS_CHANGES"
                ? t("workflow.workbench.drafts.status_needs_changes")
                : t("workflow.workbench.drafts.status_draft"),
          }))
        ),
        cell: ({ row }) => (
          <DraftStatus status={row.original.displayStatus} t={t} />
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.workbench.drafts.col_updated")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">
            {t("workflow.workbench.drafts.col_actions")}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("workflow.workbench.drafts.open")}
              onClick={() => openDraft(row.original)}
            >
              <Eye className="size-4" />
            </Button>
            {row.original.canCancel ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:text-destructive"
                title={t("workflow.workbench.drafts.delete")}
                disabled={cancelling}
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [cancelling, t]
  )

  /**
   * Client list controller: the aggregated drafts endpoint returns the full
   * set, so paging/sorting/filtering run in memory behind the shared
   * DataTable, with filters and sort URL-synced by @workspace/list-page.
   */
  const { table, total } = useClientListTable<PlatformDraft>({
    columns,
    items: allItems,
    filterBy: {
      code: (item, value) =>
        matchTextColumnFilter(value, item.code, item.title, item.subtitle, item.id),
      domain: (item, value) => matchSelectFilter(item.domain, value),
      status: (item, value) => matchSelectFilter(item.displayStatus, value),
    },
    sort: (items, sorting) =>
      sortByColumn(items, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        title: (a, b) => a.title.localeCompare(b.title),
        domain: (a, b) => a.domain.localeCompare(b.domain),
        status: (a, b) => a.displayStatus.localeCompare(b.displayStatus),
        updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      }),
    defaultPageSize: DRAFTS_PAGE_SIZE,
  })

  async function handleCancel() {
    if (!deleteTarget?.id) return
    setCancelling(true)
    try {
      if (deleteTarget.domain !== "crm_customer_registration") {
        throw new Error(t("workflow.workbench.cancel_unsupported"))
      }
      await customerDraftApi.cancel(deleteTarget.id)
      notify.success(t("workflow.workbench.cancel_success"))
      setDeleteTarget(null)
      await load()
    } catch (error) {
      notify.error(
        t("workflow.workbench.cancel_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <ListPageShell
        title={t("workflow.workbench.drafts.title")}
        totalRows={total}
        meta={
          <Badge variant="secondary">
            {t("workflow.workbench.drafts.count", { count: total })}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="default">
                  <Plus className="size-4" />
                  {t("workflow.workbench.drafts.create")}
                  <ChevronDown className="size-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {createActions.map((action) => (
                  <DropdownMenuItem
                    key={action.domain}
                    onClick={() => navigateTo(action.href)}
                  >
                    {t(`workflow.workbench.drafts.create_${action.domain}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="secondary"
              disabled={refreshing}
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              {t("workflow.workbench.actions_refresh")}
            </Button>
          </div>
        }
        criticalPending={criticalPending}
        criticalError={fetchError}
        onRetry={load}
        loadErrorTitle={t("workflow.workbench.drafts.load_failed")}
        fetching={refreshing}
        table={table}
        header={
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("workflow.workbench.drafts.description")}
            </p>
            {partialLoadFailed ? (
              <Alert>
                <AlertDescription>
                  {t("workflow.workbench.drafts.partial_load", {
                    sources: Object.keys(sourceErrors)
                      .map((source) =>
                        t(`workflow.workbench.drafts.source_${source}`)
                      )
                      .join(", "),
                  })}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        }
        toolbar={
          <ListTableToolbar
            table={table}
            exportFilename={t("workflow.workbench.drafts.title")}
            sheetName={t("workflow.workbench.drafts.title")}
            totalRowsCount={total}
          />
        }
        dialogs={
          <AlertDialog
            open={deleteTarget != null}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("workflow.workbench.drafts.delete_confirm_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("workflow.workbench.drafts.delete_confirm_description", {
                    code:
                      deleteTarget?.code ||
                      deleteTarget?.title ||
                      deleteTarget?.id ||
                      "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cancelling}>
                  {t("workflow.workbench.drafts.delete_cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={cancelling || !deleteTarget?.id}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleCancel()
                  }}
                >
                  {t("workflow.workbench.drafts.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
        onRowDoubleClick={(row) => openDraft(row.original)}
      />
    </>
  )
}

function DraftStatus({
  status,
  t,
}: {
  status: PlatformDraft["displayStatus"]
  t: ReturnType<typeof useI18n>["t"]
}) {
  const variant = status === "NEEDS_CHANGES" ? "warning" : "default"
  const label =
    status === "NEEDS_CHANGES"
      ? t("workflow.workbench.drafts.status_needs_changes")
      : t("workflow.workbench.drafts.status_draft")
  return (
    <Status variant={variant}>
      <StatusIndicator />
      <StatusLabel>{label}</StatusLabel>
    </Status>
  )
}

function domainLabel(
  domain: PlatformDraftDomain,
  t: ReturnType<typeof useI18n>["t"]
) {
  return t(`workflow.workbench.drafts.domain_${domain}`)
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function openDraft(item: PlatformDraft) {
  navigateTo(item.openHref)
}
