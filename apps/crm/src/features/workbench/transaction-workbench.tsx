import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { PageSubmenu } from "@workspace/ui/components/page-submenu"
import { useAsRef } from "@workspace/ui/hooks/use-as-ref"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import type {
  WorkbenchDirection,
  WorkItem,
  WorkItemFilter,
} from "./api"
import { useClaimWorkItem, useWorkItemSummary, useWorkItems } from "./queries"
import { WorkItemTree } from "./workbench-tree"
import { WorkbenchToolbar, type FilterState } from "./workbench-toolbar"
import { workItemColumns, searchColumns } from "./workbench-columns"
import { navigateTo } from "./nav"

const WORKBENCH_TREE_COLLAPSED_KEY = "arda.workbench.tree.collapsed"

const directionMeta = {
  incoming: {
    titleKey: "crm.workbench.incoming.title",
    descriptionKey: "crm.workbench.incoming.description",
  },
  outgoing: {
    titleKey: "crm.workbench.outgoing.title",
    descriptionKey: "crm.workbench.outgoing.description",
  },
}

export function createTransactionWorkbench(
  direction: WorkbenchDirection,
  title?: string,
  description?: string
) {
  return function TransactionWorkbench() {
    return (
      <TransactionWorkbenchInner
        direction={direction}
        title={title}
        description={description}
      />
    )
  }
}

function TransactionWorkbenchInner({
  direction,
  title,
  description,
}: {
  direction: WorkbenchDirection
  title?: string
  description?: string
}) {
  const { t } = useI18n()
  const meta = directionMeta[direction]
  const [activeNode, setActiveNode] = useState("ALL")
  const [filters, setFilters] = useState<FilterState>({})

  const baseFilter: WorkItemFilter = useMemo(
    () => ({
      direction: direction === "outgoing" ? "OUTGOING" : "INCOMING",
      limit: 100,
      node: workItemSummaryNode(activeNode) ? undefined : activeNode,
    }),
    [direction, activeNode]
  )

  const queryFilter = useMemo(() => {
    const next = { ...baseFilter }
    if (filters.keyword) next.keyword = filters.keyword
    if (filters.fromDate) next.fromDate = filters.fromDate
    if (filters.toDate) next.toDate = filters.toDate
    if (filters.accounting)
      next.accounting = filters.accounting as WorkItemFilter["accounting"]
    if (filters.slaStatus)
      next.slaStatus = filters.slaStatus as WorkItemFilter["slaStatus"]
    return next
  }, [baseFilter, filters])

  const workItemsQuery = useWorkItems(queryFilter, { refetchInterval: 15000 })
  const summaryQuery = useWorkItemSummary(baseFilter, { refetchInterval: 15000 })
  const claimWorkItem = useClaimWorkItem()

  const items = useMemo(
    () => filterWorkItemsByNode(workItemsQuery.data ?? [], activeNode),
    [workItemsQuery.data, activeNode]
  )

  const claiming = direction === "incoming" && claimWorkItem.isPending
  const claimRef = useAsRef(claimWorkItem)

  const openItem = useCallback(
    (item: WorkItem) => {
      if (direction !== "incoming") {
        navigateTo(workItemHref(item, direction))
        return
      }
      if (item.assignedTo && !item.canOpen) {
        notify.error(t("crm.workbench.claim_error"), item.claimBlockedReason)
        return
      }
      if (item.canClaim) {
        claimRef.current.mutate(
          { workItemId: item.id },
          {
            onSuccess: ({ workItem }) =>
              navigateTo(workItemHref(workItem, direction)),
          }
        )
        return
      }
      if (item.canOpen) {
        navigateTo(workItemHref(item, direction))
        return
      }
      notify.error(t("crm.workbench.claim_error"), item.claimBlockedReason)
    },
    [direction, claimRef, t]
  )

  const columns = useMemo(
    () => workItemColumns(direction, claiming, openItem),
    [direction, claiming, openItem]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const [treeCollapsed, setTreeCollapsed] = useState(() =>
    readStoredBoolean(WORKBENCH_TREE_COLLAPSED_KEY, false)
  )

  useEffect(() => {
    writeStoredBoolean(WORKBENCH_TREE_COLLAPSED_KEY, treeCollapsed)
  }, [treeCollapsed])

  return (
    <Page variant="fixed">
      <PageHeader
        title={title ?? t(meta.titleKey)}
        description={description ?? t(meta.descriptionKey)}
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={workItemsQuery.isFetching}
            onClick={() => {
              void workItemsQuery.refetch()
              void summaryQuery.refetch()
            }}
          >
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
        }
      />
      <div className="grid min-h-0 flex-1 rounded-md border md:grid-cols-[auto_minmax(0,1fr)]">
        <PageSubmenu
          title={t("crm.workbench.business_type")}
          collapsed={treeCollapsed}
          onCollapsedChange={setTreeCollapsed}
          meta={`${items.length} việc`}
          embedded
        >
          <WorkItemTree
            nodes={summaryQuery.data ?? []}
            activeNode={activeNode}
            onSelect={setActiveNode}
          />
        </PageSubmenu>
        <div className="flex min-h-0 flex-col gap-3 p-3">
          <WorkbenchToolbar
            filters={filters}
            onChange={setFilters}
            presets={direction === "incoming" ? ["accounting"] : ["slaStatus"]}
            resultCount={items.length}
          />
          <DataTable
            table={table}
            defaultDensity="comfortable"
            className="min-h-0 flex-1 overflow-auto"
          />
        </div>
      </div>
    </Page>
  )
}

export function TransactionSearchPage() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<FilterState>({})

  const queryFilter = useMemo<WorkItemFilter>(() => {
    const next: WorkItemFilter = { direction: "ALL", limit: 100 }
    if (filters.keyword) next.keyword = filters.keyword
    if (filters.fromDate) next.fromDate = filters.fromDate
    if (filters.toDate) next.toDate = filters.toDate
    if (filters.transactionStatus)
      next.transactionStatus = filters.transactionStatus
    if (filters.slaStatus)
      next.slaStatus = filters.slaStatus as WorkItemFilter["slaStatus"]
    return next
  }, [filters])

  const searchQuery = useWorkItems(queryFilter, { refetchInterval: 15000 })
  const items = searchQuery.data ?? []

  const openItem = useCallback(
    (item: WorkItem) => {
      navigateTo(
        workItemHref(
          item,
          item.direction === "OUTGOING" ? "outgoing" : "incoming"
        )
      )
    },
    []
  )

  const columns = useMemo(() => searchColumns(openItem), [openItem])
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("crm.workbench.search.title")}
        description={t("crm.workbench.search.description")}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <WorkbenchToolbar
          filters={filters}
          onChange={setFilters}
          presets={["transactionStatus", "slaStatus"]}
          keywordPlaceholder={t("crm.workbench.search_keyword_placeholder")}
          resultCount={items.length}
        />
        <DataTable
          table={table}
          defaultDensity="comfortable"
          className="min-h-0 flex-1 overflow-auto"
        />
      </div>
    </Page>
  )
}

// ── Helpers ──────────────────────────────────────────

function workItemSummaryNode(node: string) {
  return node === "ALL" || node === "MINE" || node === "SLA_BREACHED"
}

function filterWorkItemsByNode(items: WorkItem[], node: string) {
  if (!node || node === "ALL") return items
  if (node === "MINE") {
    return items.filter((item) => Boolean(item.assignedTo))
  }
  if (node === "SLA_BREACHED") {
    return items.filter((item) => item.slaStatus === "BREACHED")
  }
  return items.filter(
    (item) => item.stepCode === node || item.currentStep === node
  )
}

function workItemHref(item: WorkItem, direction: WorkbenchDirection) {
  const returnUrl = window.location.pathname + window.location.search
  if (
    (item.caseType === "CUSTOMER_REGISTRATION" ||
      item.caseType === "CUSTOMER_ADJUSTMENT") &&
    item.primaryObjectId
  ) {
    const search = new URLSearchParams({
      customerId: item.primaryObjectId,
      caseId: item.caseId,
      caseCode: item.caseCode,
      processInstanceKey: String(item.processInstanceKey ?? ""),
      elementId:
        item.candidateRole === "CUSTOMER_MAKER"
          ? "Activity_MakerRevise"
          : item.stepCode,
      role: item.candidateRole ?? "",
      returnUrl,
    })
    if (item.jobKey) {
      search.set("taskKey", String(item.jobKey))
    }
    const path =
      item.caseType === "CUSTOMER_ADJUSTMENT"
        ? "/customers/adjustments"
        : "/customers/registrations"
    return `${path}?${search.toString()}`
  }
  return caseCodeHref(direction, item.caseCode) + `&returnUrl=${encodeURIComponent(returnUrl)}`
}

function caseCodeHref(direction: WorkbenchDirection, caseCode: string) {
  const path =
    direction === "outgoing"
      ? "/workbench/outgoing-transactions"
      : "/workbench/incoming-transactions"
  return `${path}?caseCode=${encodeURIComponent(caseCode)}`
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof localStorage === "undefined") return fallback
  const value = localStorage.getItem(key)
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

function writeStoredBoolean(key: string, value: boolean) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, String(value))
}
