import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { PageSubmenu } from "@workspace/ui/components/page-submenu"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import type { WorkbenchDirection, WorkItem, WorkItemFilter, WorkItemSummaryNode } from "../api"
import { workbenchApi } from "../api"
import { WorkItemTree } from "./workbench-tree"
import { WorkbenchToolbar, type FilterState } from "./workbench-toolbar"
import { workItemColumns, searchColumns } from "../utils/workbench-columns"
import { transactionListTableLayout } from "../utils/workbench-table-layout"
import { workItemRowClassName } from "../utils/work-item-state"
import { navigateTo } from "../utils/nav"
import {
  useWorkbenchBurstRefetch,
  workbenchExpectCaseCode,
} from "../utils/burst-refetch"

const WORKBENCH_TREE_COLLAPSED_KEY = "arda.workbench.tree.collapsed"

const directionMeta = {
  incoming: {
    titleKey: "workflow.workbench.incoming.title",
    descriptionKey: "workflow.workbench.incoming.description",
  },
  outgoing: {
    titleKey: "workflow.workbench.outgoing.title",
    descriptionKey: "workflow.workbench.outgoing.description",
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

function useWorkbenchData(filter: WorkItemFilter, baseFilter: WorkItemFilter) {
  const filterRef = useRef(filter)
  filterRef.current = filter
  const baseFilterRef = useRef(baseFilter)
  baseFilterRef.current = baseFilter
  const [items, setItems] = useState<WorkItem[]>([])
  const [summary, setSummary] = useState<WorkItemSummaryNode[]>([])
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  const reload = useCallback(async () => {
    if (loadingRef.current) return // no overlap
    loadingRef.current = true
    setFetching(true)
    setError(null)
    try {
      const [wi, sm] = await Promise.all([
        workbenchApi.listWorkItems(filterRef.current),
        workbenchApi.listWorkItemSummary(baseFilterRef.current),
      ])
      if (mountedRef.current) {
        setItems(wi)
        setSummary(sm)
      }
    } catch (reason) {
      if (mountedRef.current) setError(reason)
    } finally {
      if (mountedRef.current) setFetching(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void reload()
    return () => { mountedRef.current = false }
  }, [reload])

  return { items, summary, fetching, error, reload }
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

  const { items: allItems, summary: summaryData, fetching, reload } = useWorkbenchData(queryFilter, baseFilter)
  const [claimPending, setClaimPending] = useState(false)

  const items = useMemo(
    () => filterWorkItemsByNode(allItems, activeNode),
    [allItems, activeNode]
  )

  // Burst polling: own effect that awaits reload(), schedules next, pauses when hidden
  const expectCaseCode = workbenchExpectCaseCode()
  const refetchInterval = useWorkbenchBurstRefetch(expectCaseCode)
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const filterStable = JSON.stringify(queryFilter)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, 500)
        return
      }
      await reloadRef.current()
      if (!cancelled) {
        timer = setTimeout(poll, refetchInterval)
      }
    }

    // start poll loop after initial load completes
    timer = setTimeout(poll, refetchInterval)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // reset poll when filter changes
  }, [filterStable, refetchInterval])

  const openItem = useCallback(
    async (item: WorkItem) => {
      if (direction !== "incoming") {
        navigateTo(workItemHref(item, direction))
        return
      }
      if (item.assignedTo && !item.canOpen) {
        notify.error(
          t("workflow.workbench.claim_error"),
          item.claimBlockedReason
        )
        return
      }
      if (item.canClaim) {
        setClaimPending(true)
        try {
          const { workItem } = await workbenchApi.claimWorkItem({ workItemId: item.id })
          await reload()
          navigateTo(workItemHref(workItem, direction))
        } catch (error) {
          notify.error(
            t("workflow.workbench.claim_error"),
            error instanceof Error ? error.message : undefined
          )
        } finally {
          setClaimPending(false)
        }
        return
      }
      if (item.canOpen) {
        navigateTo(workItemHref(item, direction))
        return
      }
      notify.error(t("workflow.workbench.claim_error"), item.claimBlockedReason)
    },
    [direction, reload, t]
  )

  const claiming = direction === "incoming" && claimPending

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
            disabled={fetching}
            onClick={() => void reload()}
          >
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
        }
      />
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-md border md:grid-cols-[auto_minmax(0,1fr)]">
        <PageSubmenu
          title={t("workflow.workbench.business_type")}
          collapsed={treeCollapsed}
          onCollapsedChange={setTreeCollapsed}
          meta={`${items.length} việc`}
          embedded
        >
          <WorkItemTree
            nodes={summaryData as any[]}
            activeNode={activeNode}
            onSelect={setActiveNode}
          />
        </PageSubmenu>
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-3">
          <WorkbenchToolbar
            filters={filters}
            onChange={setFilters}
            presets={direction === "incoming" ? ["accounting"] : ["slaStatus"]}
            resultCount={items.length}
          />
          {items.length === 0 && expectCaseCode && !fetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <p className="text-sm">Đang xử lý hồ sơ, vui lòng đợi trong giây lát...</p>
              <Button variant="outline" className="mt-4" onClick={() => void reload()}>
                <RefreshCw className="size-4" />
                Làm mới ngay
              </Button>
            </div>
          ) : (
            <DataTable
              table={table}
              defaultDensity="comfortable"
              rowClassName={({ original }) => workItemRowClassName(original)}
              {...transactionListTableLayout}
            />
          )}
        </div>
      </div>
    </Page>
  )
}

export function TransactionSearchPage() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<FilterState>({})
  const [items, setItems] = useState<WorkItem[]>([])
  const [_fetching, setFetching] = useState(false)

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

  const expectCaseCode = workbenchExpectCaseCode()
  const refetchInterval = useWorkbenchBurstRefetch(expectCaseCode)
  const filterRef = useRef(queryFilter)
  filterRef.current = queryFilter

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const data = await workbenchApi.listWorkItems(filterRef.current)
      setItems(data)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Polling
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, 500)
        return
      }
      await loadRef.current()
      if (!cancelled) {
        timer = setTimeout(poll, refetchInterval)
      }
    }
    timer = setTimeout(poll, refetchInterval)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [refetchInterval])

  const openItem = useCallback((item: WorkItem) => {
    navigateTo(
      workItemHref(
        item,
        item.direction === "OUTGOING" ? "outgoing" : "incoming",
        true
      )
    )
  }, [])

  const columns = useMemo(() => searchColumns(openItem), [openItem])
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("workflow.workbench.search.title")}
        description={t("workflow.workbench.search.description")}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <WorkbenchToolbar
          filters={filters}
          onChange={setFilters}
          presets={["transactionStatus", "slaStatus"]}
          keywordPlaceholder={t(
            "workflow.workbench.search_keyword_placeholder"
          )}
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

function workItemHref(
  item: WorkItem,
  direction: WorkbenchDirection,
  viewOnly = direction === "outgoing"
) {
  const returnUrl = window.location.pathname + window.location.search
  if (
    (item.caseType === "CUSTOMER_REGISTRATION" ||
      item.caseType === "CUSTOMER_ADJUSTMENT") &&
    item.id
  ) {
    const search = new URLSearchParams({
      workItemId: item.id,
      returnUrl,
    })
    if (viewOnly) {
      search.set("mode", "view")
    }
    const path =
      item.caseType === "CUSTOMER_ADJUSTMENT"
        ? "/customers/adjustments"
        : "/customers/registrations"
    return `${path}?${search.toString()}`
  }
  return (
    caseCodeHref(direction, item.caseCode) +
    `&returnUrl=${encodeURIComponent(returnUrl)}` +
    (viewOnly ? "&mode=view" : "")
  )
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
