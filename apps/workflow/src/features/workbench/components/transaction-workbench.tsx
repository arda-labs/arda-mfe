import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { PageSubmenu } from "@workspace/ui/components/page-submenu"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type {
  WorkbenchDirection,
  WorkItem,
  WorkItemFilter,
  WorkItemSummaryNode,
} from "../api"
import { workbenchApi } from "../api"
import { WorkItemTree } from "./workbench-tree"
import { DecisionDialog, type ReviewDecision } from "./decision-dialog"
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

// Case types whose domain remote does not embed the approve/reject action:
// the workbench completes them directly (CRM registration/adjustment, loan
// formation, finance postings and loan adjustments keep their own screens).
const GENERIC_DECISION_CASE_TYPES = new Set([
  "HRM_EMPLOYEE_REGISTRATION",
  "DPM_SETTLE_V2",
  "DPM_ADDITIONAL_V1",
  "DPM_PRODUCT_REGISTER_V1",
  "DPM_PRODUCT_EDIT_V1",
  "RPT_SUBMIT_V2",
  "LNM_DISB_REGISTER_V2",
  "LNM_DISB_COMPLETE_V2",
  "LNM_DISB_BATCH_REGISTER_V2",
  "LNM_DISB_BATCH_COMPLETE_V2",
  "LNM_COLLECTION_V2",
  "LNM_COLLECTION_BATCH_V2",
  "LNM_GENERAL_PROVISION_V2",
  "LNM_SPECIFIC_PROVISION_V1",
  "FIN_FUND_APPROP_V2",
  "FIN_FUND_USE_V2",
  "CFC_CONTRACT_V1",
  "CFC_AMENDMENT_V1",
  "CFC_MOVEMENT_V1",
  "IBM_PLACE_V1",
  "IBM_TOP_UP_V1",
  "IBM_INTEREST_V1",
  "IBM_EXPECTED_V1",
  "IBM_WITHDRAW_V1",
  "DPM_RATE_REGISTER_V1",
  "DPM_RATE_EDIT_V1",
  "DPM_PAY_INTEREST_V1",
  "DPM_CAPITALIZE_V1",
  "DPM_BATCH_INTEREST_V1",
])

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

  const reloadRef = useRef<() => Promise<void>>(async () => {})

  const reload = useCallback(async () => {
    if (loadingRef.current) return // no overlap
    loadingRef.current = true
    setFetching(true)
    setError(null)
    const filterAtCall = filterRef.current
    const baseAtCall = baseFilterRef.current
    try {
      const [wi, sm] = await Promise.all([
        workbenchApi.listWorkItems(filterAtCall),
        workbenchApi.listWorkItemSummary(baseAtCall),
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
      // Retry nếu filter thay đổi trong lúc fetch (tránh mất request)
      if (
        mountedRef.current &&
        (JSON.stringify(filterRef.current) !== JSON.stringify(filterAtCall) ||
          JSON.stringify(baseFilterRef.current) !== JSON.stringify(baseAtCall))
      ) {
        loadingRef.current = false
        void reloadRef.current()
      }
    }
  }, [])

  useEffect(() => {
    reloadRef.current = reload
  }, [reload])

  useEffect(() => {
    mountedRef.current = true
    void reload()
    return () => {
      mountedRef.current = false
    }
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

  const debouncedKeyword = useDebouncedValue(filters.keyword ?? "", 300)

  const queryFilter = useMemo(() => {
    const next = { ...baseFilter }
    if (debouncedKeyword) next.keyword = debouncedKeyword
    if (filters.fromDate) next.fromDate = filters.fromDate
    if (filters.toDate) next.toDate = filters.toDate
    if (filters.accounting)
      next.accounting = filters.accounting as WorkItemFilter["accounting"]
    if (filters.slaStatus)
      next.slaStatus = filters.slaStatus as WorkItemFilter["slaStatus"]
    return next
  }, [
    baseFilter,
    debouncedKeyword,
    filters.fromDate,
    filters.toDate,
    filters.accounting,
    filters.slaStatus,
  ])

  const {
    items: allItems,
    summary: summaryData,
    fetching,
    reload,
  } = useWorkbenchData(queryFilter, baseFilter)
  const [claimPending, setClaimPending] = useState(false)
  const [decisionItem, setDecisionItem] = useState<WorkItem | null>(null)
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)

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

  // Reload ngay khi filter thay đổi (không chờ poll cycle)
  useEffect(() => {
    void reload()
  }, [reload, filterStable])

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

  const openClaimedItem = useCallback(
    (item: WorkItem) => {
      if (item.caseType && GENERIC_DECISION_CASE_TYPES.has(item.caseType)) {
        setDecisionItem(item)
        return
      }
      navigateTo(workItemHref(item, direction))
    },
    [direction]
  )

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
          const { workItem } = await workbenchApi.claimWorkItem({
            workItemId: item.id,
          })
          await reload()
          openClaimedItem(workItem)
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
        openClaimedItem(item)
        return
      }
      notify.error(t("workflow.workbench.claim_error"), item.claimBlockedReason)
    },
    [direction, openClaimedItem, reload, t]
  )

  const confirmDecision = useCallback(
    async (decision: ReviewDecision, comment: string) => {
      const item = decisionItem
      if (!item) return
      if (!item.jobKey || !item.processInstanceKey) {
        notify.error(t("workflow.workbench.decision_error"))
        return
      }
      setDecisionSubmitting(true)
      try {
        await workbenchApi.completeTask({
          jobKey: item.jobKey,
          processInstanceKey: item.processInstanceKey,
          elementId: item.stepCode,
          variables: {
            decision,
            reviewDecision: decision,
            comment,
            reviewComment: comment,
          },
        })
        notify.success(t("workflow.workbench.decision_success"))
        setDecisionItem(null)
        await reload()
      } catch (error) {
        notify.error(
          t("workflow.workbench.decision_error"),
          error instanceof Error ? error.message : undefined
        )
      } finally {
        setDecisionSubmitting(false)
      }
    },
    [decisionItem, reload, t]
  )

  const claiming = direction === "incoming" && claimPending

  const columns = useMemo(
    () => workItemColumns(direction, claiming, openItem, t),
    [direction, claiming, openItem, t]
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
            {t("workflow.workbench.actions_refresh")}
          </Button>
        }
      />
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-md border md:grid-cols-[auto_minmax(0,1fr)]">
        <PageSubmenu
          title={t("workflow.workbench.business_type")}
          collapsed={treeCollapsed}
          onCollapsedChange={setTreeCollapsed}
          meta={t("workflow.workbench.tree_count", { count: items.length })}
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
              <p className="text-sm">
                {t("workflow.workbench.processing_wait")}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void reload()}
              >
                <RefreshCw className="size-4" />
                {t("workflow.workbench.refresh_now")}
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
      <DecisionDialog
        item={decisionItem}
        submitting={decisionSubmitting}
        onClose={() => setDecisionItem(null)}
        onConfirm={(decision, comment) =>
          void confirmDecision(decision, comment)
        }
      />
    </Page>
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function TransactionSearchPage() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<FilterState>({})
  const [items, setItems] = useState<WorkItem[]>([])

  const debouncedKeyword = useDebouncedValue(filters.keyword ?? "", 300)

  const queryFilter = useMemo<WorkItemFilter>(() => {
    const next: WorkItemFilter = { direction: "ALL", limit: 100 }
    if (debouncedKeyword) next.keyword = debouncedKeyword
    if (filters.fromDate) next.fromDate = filters.fromDate
    if (filters.toDate) next.toDate = filters.toDate
    if (filters.transactionStatus)
      next.transactionStatus = filters.transactionStatus
    if (filters.slaStatus)
      next.slaStatus = filters.slaStatus as WorkItemFilter["slaStatus"]
    return next
  }, [
    debouncedKeyword,
    filters.fromDate,
    filters.toDate,
    filters.transactionStatus,
    filters.slaStatus,
  ])

  const filterStable = JSON.stringify(queryFilter)
  const expectCaseCode = workbenchExpectCaseCode()
  const refetchInterval = useWorkbenchBurstRefetch(expectCaseCode)
  const filterRef = useRef(queryFilter)
  filterRef.current = queryFilter

  const load = useCallback(async () => {
    try {
      const data = await workbenchApi.listWorkItems(filterRef.current)
      setItems(data)
    } finally {
    }
  }, [])

  // Reload khi filter thay đổi
  useEffect(() => {
    void load()
  }, [load, filterStable])

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

  const columns = useMemo(() => searchColumns(openItem, t), [openItem, t])
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

/**
 * Case type → target screen, deep-linked the CRM way:
 * `?workItemId=...&returnUrl=...` (+ `&mode=view` for outgoing / search so
 * the screen opens read-only). Unmapped case types fall back to the
 * case-code workbench URL.
 *
 * LIMITATION: the finance posting lists and the loans hub do NOT read
 * `workItemId` — approve/reject still happens inside the workbench. The
 * mapping only routes the user to the right domain list; when finance/loan
 * grow dedicated per-flow detail screens, refine the targets (and read the
 * work-item params there).
 */
const CASE_TYPE_HREF: Record<string, string> = {
  // CRM (deep-link fully consumed by the registration/adjustment screens).
  CUSTOMER_REGISTRATION: "/customers/registrations",
  CUSTOMER_ADJUSTMENT: "/customers/adjustments",
  // Finance manual posting flows — deep-link vào màn duyệt (review) đọc
  // workItemId + case variables, hiển thị bút toán và approve/reject tại chỗ.
  FIN_SINGLE_ENTRY_V2: "/finance/posting/review",
  FIN_DOUBLE_ENTRY_V2: "/finance/posting/review",
  FIN_OFF_BALANCE_V2: "/finance/posting/review",
  FIN_TXN_CANCEL_V2: "/finance/posting/review",
  FIN_CLOSING_V2: "/finance/posting/review",
  // Loan formation deep-link màn stage riêng; 11 adjustment kinds deep-link
  // màn duyệt điều chỉnh (đọc workItemId + case vars → payload read-only);
  // LNM_DISB_* / LNM_COLLECTION giữ /loans — batch screens chưa đọc workItemId.
  LOAN_FORMATION_V2: "/loans/formation",
  LNM_DISB_REGISTER_V2: "/loans",
  LNM_DISB_COMPLETE_V2: "/loans",
  LNM_COLLECTION_V2: "/loans",
  LNM_DEBT_CHANGE_V2: "/loans/adjustments/review",
  LNM_RATE_CHANGE_V2: "/loans/adjustments/review",
  LNM_RESTRUCTURE_V2: "/loans/adjustments/review",
  LNM_WAIVER_V2: "/loans/adjustments/review",
  LNM_WRITEOFF_V2: "/loans/adjustments/review",
  LNM_RECOVERY_V2: "/loans/adjustments/review",
  LNM_FUND_CHECK_V2: "/loans/adjustments/review",
  LNM_REVENUE_ALLOCATION_V2: "/loans/adjustments/review",
  LNM_VFU_FEE_ALLOCATION_V2: "/loans/adjustments/review",
  LNM_OFF_BALANCE_EXPORT_V2: "/loans/adjustments/review",
  LNM_MORTGAGE_ADJUST_V2: "/loans/adjustments/review",
}

function workItemHref(
  item: WorkItem,
  direction: WorkbenchDirection,
  viewOnly = direction === "outgoing"
) {
  const returnUrl = window.location.pathname + window.location.search
  const targetPath = item.caseType ? CASE_TYPE_HREF[item.caseType] : undefined
  if (targetPath && item.id) {
    const search = new URLSearchParams({
      workItemId: item.id,
      returnUrl,
    })
    if (viewOnly) {
      search.set("mode", "view")
    }
    return `${targetPath}?${search.toString()}`
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
