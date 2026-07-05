import { useMemo, useState } from "react"
import {
  ChevronDown,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { listQueryShellState, pageGateFromQueries } from "@workspace/core/query/list-query"
import { useI18n } from "@workspace/i18n"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/alert"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { SelectPopover } from "@workspace/ui/components/select-popover"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import {
  useCancelPlatformDraft,
  usePlatformDrafts,
} from "./drafts/queries"
import type {
  PlatformDraft,
  PlatformDraftDomain,
  PlatformDraftDomainFilter,
  PlatformDraftStatusFilter,
} from "./drafts/types"
import { navigateTo } from "./nav"

type DraftFilter = {
  q: string
  domain: PlatformDraftDomainFilter
  status: PlatformDraftStatusFilter
}

const defaultFilter: DraftFilter = {
  q: "",
  domain: "ALL",
  status: "ALL",
}

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
  const [filter, setFilter] = useState<DraftFilter>(defaultFilter)
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<PlatformDraft | null>(null)

  const draftsQuery = usePlatformDrafts()
  const cancelDraft = useCancelPlatformDraft()
  const pageGate = pageGateFromQueries(draftsQuery)
  const { fetching } = listQueryShellState(draftsQuery)

  const sourceErrors = draftsQuery.data?.errors ?? {}
  const partialLoadFailed = Object.keys(sourceErrors).length > 0

  const items = useMemo(() => {
    const all = draftsQuery.data?.items ?? []
    const q = submittedQuery.trim().toLowerCase()
    return all.filter((item) => {
      if (filter.domain !== "ALL" && item.domain !== filter.domain) return false
      if (filter.status !== "ALL" && item.displayStatus !== filter.status) {
        return false
      }
      if (!q) return true
      const haystack = [item.code, item.title, item.subtitle, item.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [draftsQuery.data?.items, filter.domain, filter.status, submittedQuery])

  const columns = useMemo<ColumnDef<PlatformDraft>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("crm.workbench.drafts.col_code"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "title",
        header: t("crm.workbench.drafts.col_title"),
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
        header: t("crm.workbench.drafts.col_domain"),
        cell: ({ row }) => (
          <Badge variant="outline">{domainLabel(row.original.domain, t)}</Badge>
        ),
      },
      {
        id: "status",
        header: t("crm.workbench.drafts.col_status"),
        cell: ({ row }) => (
          <DraftStatus status={row.original.displayStatus} t={t} />
        ),
      },
      {
        accessorKey: "updatedAt",
        header: t("crm.workbench.drafts.col_updated"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("crm.workbench.drafts.col_actions"),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("crm.workbench.drafts.open")}
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
                title={t("crm.workbench.drafts.delete")}
                disabled={cancelDraft.isPending}
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [cancelDraft.isPending, t]
  )

  const { table } = useDataTable({
    columns,
    data: items,
    pageCount: Math.max(1, Math.ceil(items.length / 25)),
    initialState: { pagination: { pageSize: 25, pageIndex: 0 } },
  })

  const hasActiveFilter =
    submittedQuery !== "" ||
    filter.domain !== "ALL" ||
    filter.status !== "ALL"

  return (
    <>
      <ListPageShell
        title={t("crm.workbench.drafts.title")}
        meta={
          <Badge variant="secondary">
            {t("crm.workbench.drafts.count", { count: items.length })}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="default">
                  <Plus className="size-4" />
                  {t("crm.workbench.drafts.create")}
                  <ChevronDown className="size-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {createActions.map((action) => (
                  <DropdownMenuItem
                    key={action.domain}
                    onClick={() => navigateTo(action.href)}
                  >
                    {t(`crm.workbench.drafts.create_${action.domain}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="secondary"
              disabled={draftsQuery.isFetching}
              onClick={() => void draftsQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              {t("crm.actions.refresh")}
            </Button>
          </div>
        }
        criticalPending={pageGate.criticalPending}
        criticalError={pageGate.criticalError}
        onRetry={pageGate.onRetry}
        loadErrorTitle={t("crm.workbench.drafts.load_failed")}
        fetching={fetching}
        table={table}
        header={
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("crm.workbench.drafts.description")}
            </p>
            {partialLoadFailed ? (
              <Alert>
                <AlertDescription>
                  {t("crm.workbench.drafts.partial_load", {
                    sources: Object.keys(sourceErrors)
                      .map((source) =>
                        t(`crm.workbench.drafts.source_${source}`)
                      )
                      .join(", "),
                  })}
                </AlertDescription>
              </Alert>
            ) : null}
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setSubmittedQuery(filter.q.trim())
              }}
            >
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="h-8 pl-9"
                  value={filter.q}
                  placeholder={t("crm.workbench.drafts.search_placeholder")}
                  onChange={(event) =>
                    setFilter((prev) => ({ ...prev, q: event.target.value }))
                  }
                />
              </div>
              <SelectPopover
                label={t("crm.workbench.drafts.filter_domain")}
                value={filter.domain === "ALL" ? "" : filter.domain}
                onChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    domain: (value || "ALL") as PlatformDraftDomainFilter,
                  }))
                }
                options={[
                  {
                    label: t("crm.workbench.drafts.filter_domain_all"),
                    value: "",
                  },
                  {
                    label: t(
                      "crm.workbench.drafts.domain_crm_customer_registration"
                    ),
                    value: "crm_customer_registration",
                  },
                  {
                    label: t("crm.workbench.drafts.domain_finance_incoming"),
                    value: "finance_incoming",
                  },
                  {
                    label: t("crm.workbench.drafts.domain_finance_outgoing"),
                    value: "finance_outgoing",
                  },
                  {
                    label: t(
                      "crm.workbench.drafts.domain_hrm_employee_registration"
                    ),
                    value: "hrm_employee_registration",
                  },
                ]}
              />
              <SelectPopover
                label={t("crm.workbench.drafts.filter_status")}
                value={filter.status === "ALL" ? "" : filter.status}
                onChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    status: (value || "ALL") as PlatformDraftStatusFilter,
                  }))
                }
                options={[
                  {
                    label: t("crm.workbench.drafts.filter_status_all"),
                    value: "",
                  },
                  {
                    label: t("crm.workbench.drafts.filter_status_draft"),
                    value: "DRAFT",
                  },
                  {
                    label: t("crm.workbench.drafts.filter_status_needs_changes"),
                    value: "NEEDS_CHANGES",
                  },
                ]}
              />
              <Button type="submit" size="sm" className="h-8">
                <Search className="size-4" />
                {t("crm.actions.search")}
              </Button>
              {hasActiveFilter ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-muted-foreground"
                  onClick={() => {
                    setFilter(defaultFilter)
                    setSubmittedQuery("")
                  }}
                >
                  <XCircle className="size-3.5" />
                  {t("crm.workbench.drafts.clear_filters")}
                </Button>
              ) : null}
            </form>
          </div>
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
                  {t("crm.workbench.drafts.delete_confirm_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("crm.workbench.drafts.delete_confirm_description", {
                    code:
                      deleteTarget?.code || deleteTarget?.title || deleteTarget?.id || "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cancelDraft.isPending}>
                  {t("crm.workbench.drafts.delete_cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={cancelDraft.isPending || !deleteTarget?.id}
                  onClick={(event) => {
                    event.preventDefault()
                    if (!deleteTarget?.id) return
                    cancelDraft.mutate(
                      { domain: deleteTarget.domain, id: deleteTarget.id },
                      { onSuccess: () => setDeleteTarget(null) }
                    )
                  }}
                >
                  {t("crm.workbench.drafts.delete")}
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
      ? t("crm.workbench.drafts.status_needs_changes")
      : t("crm.workbench.drafts.status_draft")
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
  return t(`crm.workbench.drafts.domain_${domain}`)
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN", {
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
