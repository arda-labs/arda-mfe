import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DatePopover } from "@workspace/ui/components/date-popover"
import { Input } from "@workspace/ui/components/input"
import { SelectPopover } from "@workspace/ui/components/select-popover"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { PageSubmenu } from "@workspace/ui/components/page-submenu"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { useAsRef } from "@workspace/ui/hooks/use-as-ref"
import { cn } from "@workspace/ui/lib/utils"
import { notify } from "@workspace/notifications/notify"
import type { Customer } from "../customers/api"
import { useCustomerDrafts } from "../customers/queries"
import {
  type WorkbenchDirection,
  type WorkbenchSearchDirection,
  type WorkItem,
  type WorkItemFilter,
  type WorkItemSummaryNode,
} from "./api"
import { useClaimWorkItem, useWorkItemSummary, useWorkItems } from "./queries"

type WorkbenchRoute = "drafts" | "incoming" | "outgoing" | "search"

const WORKBENCH_TREE_COLLAPSED_KEY = "arda.workbench.tree.collapsed"

const directionMeta = {
  incoming: {
    title: "Giao dịch đến",
    description:
      "Hàng việc xử lý giao dịch đến, ưu tiên theo bước hiện tại và SLA.",
    icon: ArrowDownToLine,
  },
  outgoing: {
    title: "Giao dịch đi",
    description:
      "Hàng việc xử lý giao dịch đi, ưu tiên theo bước hiện tại và SLA.",
    icon: ArrowUpFromLine,
  },
} satisfies Record<
  WorkbenchDirection,
  {
    title: string
    description: string
    icon: typeof ArrowDownToLine
  }
>

export function WorkbenchPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  if (route === "incoming") return <TransactionWorkbench direction="incoming" />
  if (route === "outgoing") return <TransactionWorkbench direction="outgoing" />
  if (route === "search") return <TransactionSearchPage />
  return <DraftWorkbenchPage />
}

function DraftWorkbenchPage() {
  const draftsQuery = useCustomerDrafts()
  const items = draftsQuery.data ?? []

  return (
    <Page variant="scroll">
      <PageHeader
        title="Hồ sơ nhập"
        icon={FileText}
        description="Các bản nháp chưa submit vào BPMN. Khi trình duyệt thành công, hồ sơ sẽ thành case workflow."
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={draftsQuery.isFetching}
            onClick={() => void draftsQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Tải lại
          </Button>
        }
      />
      <DraftsTable items={items} />
    </Page>
  )
}

function DraftsTable({ items }: { items: Customer[] }) {
  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.id}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Tiêu đề",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "type",
        header: "Nghiệp vụ",
        cell: ({ row }) => customerTypeLabel(row.original),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Cập nhật",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              navigateTo(
                `/customers/registrations?customerId=${encodeURIComponent(row.original.id)}`
              )
            }
          >
            <Eye className="size-4" />
            Mở
          </Button>
        ),
      },
    ],
    []
  )
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })
  return <DataTable table={table} defaultDensity="comfortable" />
}

function TransactionWorkbench({
  direction,
}: {
  direction: WorkbenchDirection
}) {
  const meta = directionMeta[direction]
  const Icon = meta.icon
  const [activeNode, setActiveNode] = useState("ALL")
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const baseFilter: WorkItemFilter = useMemo(
    () => ({
      direction: apiDirection(direction),
      limit: 100,
      node: activeNode === "ALL" ? undefined : activeNode,
    }),
    [direction, activeNode]
  )
  const queryFilter = useMemo(() => {
    const next = { ...baseFilter }
    for (const f of columnFilters) {
      if (f.id === "keyword") next.keyword = String(f.value ?? "")
      if (f.id === "fromDate") next.fromDate = toDateString(f.value)
      if (f.id === "toDate") next.toDate = toDateString(f.value)
      if (f.id === "accounting") next.accounting = asAccounting(f.value)
      if (f.id === "slaStatus") next.slaStatus = asSlaStatus(f.value)
    }
    return next
  }, [baseFilter, columnFilters])

  const workItemsQuery = useWorkItems(queryFilter, { refetchInterval: 15000 })
  const summaryQuery = useWorkItemSummary(baseFilter, {
    refetchInterval: 15000,
  })
  const claimWorkItem = useClaimWorkItem()
  const items = workItemsQuery.data ?? []
  const nodes = summaryQuery.data ?? []
  const [treeCollapsed, setTreeCollapsed] = useState(() =>
    readStoredBoolean(WORKBENCH_TREE_COLLAPSED_KEY, false)
  )

  useEffect(() => {
    writeStoredBoolean(WORKBENCH_TREE_COLLAPSED_KEY, treeCollapsed)
  }, [treeCollapsed])

  const claiming = direction === "incoming" && claimWorkItem.isPending
  const claimRef = useAsRef(claimWorkItem)
  const openWorkItem = useCallback(
    (item: WorkItem) => {
      if (direction !== "incoming") {
        navigateTo(workItemHref(item, direction))
        return
      }
      if (item.assignedTo && !item.canOpen) {
        notify.error("Không thể nhận task", item.claimBlockedReason)
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
      notify.error("Không thể nhận task", item.claimBlockedReason)
    },
    [direction, claimRef]
  )

  return (
    <Page variant="fixed">
      <PageHeader
        title={meta.title}
        icon={Icon}
        description={meta.description}
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
          title="Loại nghiệp vụ"
          icon={Icon}
          collapsed={treeCollapsed}
          onCollapsedChange={setTreeCollapsed}
          meta={`${items.length} việc`}
          embedded
        >
          <WorkItemTree
            nodes={nodes}
            activeNode={activeNode}
            onSelect={setActiveNode}
          />
        </PageSubmenu>
        <div className="flex min-h-0 flex-col gap-3 p-3">
          <WorkbenchDataTable
            direction={direction}
            items={items}
            claiming={claiming}
            onOpen={openWorkItem}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
          />
        </div>
      </div>
    </Page>
  )
}

function WorkbenchDataTable({
  direction,
  items,
  claiming,
  onOpen,
  columnFilters,
  onColumnFiltersChange,
}: {
  direction: WorkbenchDirection
  items: WorkItem[]
  claiming: boolean
  onOpen: (item: WorkItem) => void
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: (
    updater:
      ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)
  ) => void
}) {
  const setFilter = useCallback(
    (id: string, value: unknown) => {
      onColumnFiltersChange((prev) => {
        const next = prev.filter((f) => f.id !== id)
        if (value !== undefined && value !== null && value !== "") {
          next.push({ id, value })
        }
        return next
      })
    },
    [onColumnFiltersChange]
  )
  const getFilter = useCallback(
    (id: string) => columnFilters.find((f) => f.id === id)?.value,
    [columnFilters]
  )
  const isIncoming = direction === "incoming"
  const columns = useMemo(
    () => workItemColumns(direction, claiming, onOpen),
    [direction, claiming, onOpen]
  )
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Mã / tiêu đề giao dịch"
            value={String(getFilter("keyword") ?? "")}
            onChange={(e) => setFilter("keyword", e.target.value || undefined)}
            className="h-8 w-56 pl-8"
          />
        </div>
        <DatePopover
          value={getFilter("fromDate") as string | undefined}
          onChange={(v) => setFilter("fromDate", v)}
          label="Từ ngày"
        />
        <DatePopover
          value={getFilter("toDate") as string | undefined}
          onChange={(v) => setFilter("toDate", v)}
          label="Đến ngày"
        />
        {isIncoming ? (
          <SelectPopover
            value={getFilter("accounting") as string | undefined}
            onChange={(v) => setFilter("accounting", v || undefined)}
            label="Loại hạch toán"
            options={[
              { label: "Tất cả", value: "" },
              { label: "Có hạch toán", value: "POSTED" },
              { label: "Không hạch toán", value: "NOT_POSTED" },
            ]}
          />
        ) : (
          <SelectPopover
            value={getFilter("slaStatus") as string | undefined}
            onChange={(v) => setFilter("slaStatus", v || undefined)}
            label="Trạng thái SLA"
            options={[
              { label: "Tất cả", value: "" },
              { label: "Đạt SLA", value: "MET" },
              { label: "Không đạt SLA", value: "BREACHED" },
            ]}
          />
        )}
        {columnFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => onColumnFiltersChange([])}
          >
            <XCircle className="size-3.5" />
            Xoá bộ lọc
          </Button>
        )}
      </div>
      <DataTable
        table={table}
        defaultDensity="comfortable"
        className="min-h-0 flex-1 overflow-auto"
      />
    </div>
  )
}

function TransactionSearchPage() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const queryFilter = useMemo<WorkItemFilter>(() => {
    const next: WorkItemFilter = { direction: "ALL", limit: 100 }
    for (const f of columnFilters) {
      if (f.id === "keyword") next.keyword = String(f.value ?? "")
      if (f.id === "fromDate") next.fromDate = toDateString(f.value)
      if (f.id === "toDate") next.toDate = toDateString(f.value)
      if (f.id === "transactionStatus")
        next.transactionStatus =
          Array.isArray(f.value) && f.value[0] ? String(f.value[0]) : "ALL"
      if (f.id === "slaStatus") next.slaStatus = asSlaStatus(f.value)
    }
    return next
  }, [columnFilters])

  const searchQuery = useWorkItems(queryFilter, { refetchInterval: 15000 })
  const items = searchQuery.data ?? []
  const onOpen = (item: WorkItem) =>
    navigateTo(
      workItemHref(
        item,
        item.direction === "OUTGOING" ? "outgoing" : "incoming"
      )
    )

  const columns = useMemo(() => searchColumns(onOpen), [])
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const setFilter = useCallback((id: string, value: unknown) => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (value !== undefined && value !== null && value !== "") {
        next.push({ id, value })
      }
      return next
    })
  }, [])
  const getFilter = useCallback(
    (id: string) => columnFilters.find((f) => f.id === id)?.value,
    [columnFilters]
  )

  return (
    <Page variant="fixed">
      <PageHeader
        title="Tìm kiếm giao dịch"
        icon={Search}
        description="Tra cứu giao dịch theo ngày, trạng thái xử lý và trạng thái SLA."
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Mã / tiêu đề"
              value={String(getFilter("keyword") ?? "")}
              onChange={(e) =>
                setFilter("keyword", e.target.value || undefined)
              }
              className="h-8 w-48 pl-8"
            />
          </div>
          <DatePopover
            value={getFilter("fromDate") as string | undefined}
            onChange={(v) => setFilter("fromDate", v)}
            label="Từ ngày"
          />
          <DatePopover
            value={getFilter("toDate") as string | undefined}
            onChange={(v) => setFilter("toDate", v)}
            label="Đến ngày"
          />
          <SelectPopover
            value={getFilter("transactionStatus") as string | undefined}
            onChange={(v) => setFilter("transactionStatus", v || undefined)}
            label="Trạng thái giao dịch"
            options={[
              { label: "Tất cả", value: "" },
              { label: "Đã gửi", value: "SUBMITTED" },
              { label: "Đang xử lý", value: "IN_REVIEW" },
              { label: "Hoàn tất", value: "COMPLETED" },
              { label: "Từ chối", value: "REJECTED" },
            ]}
          />
          <SelectPopover
            value={getFilter("slaStatus") as string | undefined}
            onChange={(v) => setFilter("slaStatus", v || undefined)}
            label="Trạng thái SLA"
            options={[
              { label: "Tất cả", value: "" },
              { label: "Đạt SLA", value: "MET" },
              { label: "Không đạt SLA", value: "BREACHED" },
            ]}
          />
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setColumnFilters([])}
            >
              <XCircle className="size-3.5" />
              Xoá bộ lọc
            </Button>
          )}
        </div>
        <DataTable
          table={table}
          defaultDensity="comfortable"
          className="min-h-0 flex-1 overflow-auto"
        />
      </div>
    </Page>
  )
}

function searchColumns(
  onOpen: (item: WorkItem) => void
): ColumnDef<WorkItem>[] {
  return [
    {
      id: "info",
      header: "Thông tin giao dịch",
      cell: ({ row }) => (
        <div className="min-w-80">
          <WorkItemInfo
            item={row.original}
            claiming={false}
            forceOpen
            onOpen={onOpen}
          />
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="min-w-36">
          <StatusBadge
            status={row.original.transactionStatus || row.original.status}
          />
        </div>
      ),
    },
    {
      id: "due",
      header: "Hạn xử lý",
      cell: ({ row }) => (
        <div className="min-w-40 tabular-nums">
          {formatDateTime(row.original.slaDueAt)}
        </div>
      ),
    },
    {
      id: "completed",
      header: "Thời gian hoàn thành",
      cell: ({ row }) => (
        <div className="min-w-40 tabular-nums">
          {completionTime(row.original)}
        </div>
      ),
    },
    {
      id: "sla",
      header: "Trạng thái SLA",
      cell: ({ row }) => (
        <div className="min-w-40">
          <SlaStatus
            dueAt={row.original.slaDueAt}
            status={row.original.slaStatus}
          />
        </div>
      ),
    },
    {
      id: "creator",
      header: "Người tạo",
      cell: ({ row }) => (
        <div className="min-w-40">{row.original.createdBy || "-"}</div>
      ),
    },
  ]
}

function WorkItemTree({
  nodes,
  activeNode,
  onSelect,
}: {
  nodes: WorkItemSummaryNode[]
  activeNode: string
  onSelect: (node: string) => void
}) {
  const visibleNodes = nodes.length
    ? nodes
    : [{ id: "ALL", label: "Tất cả việc được phép nhận", count: 0 }]
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
    {}
  )

  function toggleNode(nodeId: string) {
    setExpandedNodes((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }))
  }

  return (
    <div className="space-y-0.5" role="tree" aria-label="Loại nghiệp vụ">
      {visibleNodes.map((node) => (
        <WorkItemTreeNode
          key={node.id}
          node={node}
          level={1}
          activeNode={activeNode}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function WorkItemTreeNode({
  node,
  level,
  activeNode,
  expandedNodes,
  onToggle,
  onSelect,
}: {
  node: WorkItemSummaryNode
  level: number
  activeNode: string
  expandedNodes: Record<string, boolean>
  onToggle: (nodeId: string) => void
  onSelect: (nodeId: string) => void
}) {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const isExpanded = expandedNodes[node.id] ?? false
  const isSelected = activeNode === node.id
  const count = hasChildren
    ? node.count || children.reduce((total, child) => total + child.count, 0)
    : node.count

  return (
    <div role="none">
      <div
        className={cn(
          "group flex items-center rounded-md text-sm",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{ paddingLeft: (level - 1) * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
            aria-expanded={isExpanded}
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-2 pr-2 text-left"
          onClick={() => onSelect(node.id)}
        >
          <span className="truncate">{node.label}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {node.overdue ? (
              <Badge variant="destructive">{node.overdue}</Badge>
            ) : null}
            <Badge variant="secondary">{count}</Badge>
          </span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div role="group" className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <WorkItemTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeNode={activeNode}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function workItemColumns(
  direction: WorkbenchDirection,
  claiming: boolean,
  onOpen: (item: WorkItem) => void
): ColumnDef<WorkItem>[] {
  const isIncoming = direction === "incoming"
  const cols: ColumnDef<WorkItem>[] = [
    {
      id: "info",
      header: isIncoming ? "Thông tin giao dịch" : "Thông tin tác vụ giao dịch",
      cell: ({ row }) => (
        <div className="min-w-80">
          <WorkItemInfo
            item={row.original}
            claiming={claiming}
            forceOpen={!isIncoming}
            onOpen={onOpen}
          />
        </div>
      ),
    },
  ]

  if (isIncoming) {
    cols.push(
      {
        id: "sla",
        header: "Trạng thái SLA",
        cell: ({ row }) => (
          <div className="min-w-40">
            <SlaStatus
              dueAt={row.original.slaDueAt}
              status={row.original.slaStatus}
            />
          </div>
        ),
      },
      {
        id: "progress",
        header: "Tiến độ thời gian",
        cell: ({ row }) => (
          <div className="min-w-72">
            <TimeProgress item={row.original} />
          </div>
        ),
      },
      {
        id: "assignee",
        header: "Người xử lý",
        cell: ({ row }) => (
          <div className="min-w-56">
            <AssigneeFlow item={row.original} />
          </div>
        ),
      }
    )
  } else {
    cols.push(
      {
        id: "completed",
        header: "Thời gian hoàn thành",
        cell: ({ row }) => (
          <div className="min-w-40 tabular-nums">
            {completionTime(row.original)}
          </div>
        ),
      },
      {
        id: "due",
        header: "Hạn xử lý",
        cell: ({ row }) => (
          <div className="min-w-40 tabular-nums">
            {formatDateTime(row.original.slaDueAt)}
          </div>
        ),
      },
      {
        id: "sla",
        header: "Trạng thái SLA",
        cell: ({ row }) => (
          <div className="min-w-40">
            <SlaStatus
              dueAt={row.original.slaDueAt}
              status={row.original.slaStatus}
            />
          </div>
        ),
      },
      {
        id: "prev",
        header: "Người xử lý trước",
        cell: ({ row }) => (
          <div className="min-w-44">{previousAssignee(row.original)}</div>
        ),
      }
    )
  }
  return cols
}

function toDateString(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined
  return String(value)
}

function asAccounting(value: unknown): WorkItemFilter["accounting"] {
  if (Array.isArray(value) && value[0])
    return value[0] as WorkItemFilter["accounting"]
  if (typeof value === "string" && value)
    return value as WorkItemFilter["accounting"]
  return "ALL"
}

function asSlaStatus(value: unknown): WorkItemFilter["slaStatus"] {
  if (Array.isArray(value) && value[0])
    return value[0] as WorkItemFilter["slaStatus"]
  if (typeof value === "string" && value)
    return value as WorkItemFilter["slaStatus"]
  return "ALL"
}

function WorkItemInfo({
  item,
  claiming,
  forceOpen,
  onOpen,
}: {
  item: WorkItem
  claiming: boolean
  forceOpen?: boolean
  onOpen: (item: WorkItem) => void
}) {
  const canAct = forceOpen || item.canClaim || item.canOpen
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <div>
          <p className="font-medium text-pretty">{item.title}</p>
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
            {item.description || item.summary || item.caseCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{item.caseCode}</Badge>
          <Badge variant="secondary">
            {stepLabel(item.stepCode || item.currentStep || "-")}
          </Badge>
          {item.taskType ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              {item.taskType}
            </Badge>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={item.canClaim ? "default" : "outline"}
        disabled={claiming || !canAct}
        onClick={(event) => {
          event.stopPropagation()
          onOpen(item)
        }}
      >
        <Eye className="size-4" />
        {forceOpen
          ? "Mở"
          : item.canClaim
            ? "Nhận & mở"
            : item.canOpen
              ? "Mở"
              : "Đã giữ"}
      </Button>
    </div>
  )
}

function TimeProgress({ item }: { item: WorkItem }) {
  return (
    <div className="space-y-3">
      <ProgressRail status={item.status} slaStatus={item.slaStatus} />
      <div className="grid gap-2 text-xs tabular-nums sm:grid-cols-3">
        <TimePoint label="Bắt đầu" value={item.createdAt} />
        <TimePoint label="Hiện tại" value={item.assignedAt || item.updatedAt} />
        <TimePoint label="Hạn xử lý" value={item.slaDueAt} />
      </div>
    </div>
  )
}

function TimePoint({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{formatDateTime(value)}</p>
    </div>
  )
}

function AssigneeFlow({ item }: { item: WorkItem }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">
        {previousAssignee(item)}{" "}
        <span className="text-muted-foreground">-&gt;</span>{" "}
        {item.assignedTo || "Chưa nhận"}
      </p>
      <p className="text-muted-foreground">
        {item.candidateRole || "Chưa gán vai trò"}
      </p>
    </div>
  )
}

function ProgressRail({
  status,
  slaStatus,
}: {
  status?: string
  slaStatus?: WorkItem["slaStatus"]
}) {
  const steps = ["READY", "CLAIMED", "COMPLETED"]
  const activeIndex = status === "COMPLETED" ? 2 : status === "CLAIMED" ? 1 : 0
  return (
    <div className="grid grid-cols-3 gap-1">
      {steps.map((step, index) => (
        <span
          key={step}
          className={cn(
            "h-1.5 rounded-full bg-muted",
            index <= activeIndex && "bg-primary",
            slaStatus === "BREACHED" &&
              index <= activeIndex &&
              "bg-destructive",
            status === "COMPLETED" && index <= activeIndex && "bg-emerald-600"
          )}
        />
      ))}
    </div>
  )
}

function SlaStatus({
  dueAt,
  status,
}: {
  dueAt?: string
  status?: WorkItem["slaStatus"]
}) {
  const sla = slaInfo(dueAt, status)
  return (
    <div className="space-y-1">
      <Badge
        variant={sla.variant}
        className={cn("gap-1 tabular-nums", sla.className)}
      >
        <Clock3 className="size-3" />
        {sla.label}
      </Badge>
      <p className="text-xs text-muted-foreground tabular-nums">{sla.detail}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED" || status === "APPROVED"
      ? "default"
      : status === "FAILED" || status === "REJECTED"
        ? "destructive"
        : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function slaInfo(
  dueAt?: string,
  status?: WorkItem["slaStatus"]
): {
  label: string
  detail: string
  variant: "default" | "secondary" | "destructive" | "outline"
  className?: string
} {
  if (!dueAt || status === "NONE") {
    return {
      label: "Chưa gán SLA",
      detail: "Không có hạn xử lý",
      variant: "outline",
    }
  }
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) {
    return { label: "SLA", detail: dueAt, variant: "outline" }
  }
  const diffMs = due.getTime() - Date.now()
  if (diffMs < 0 || status === "BREACHED") {
    return {
      label: "Quá hạn",
      detail: `${durationLabel(-diffMs)} trước · ${formatDateTime(dueAt)}`,
      variant: "destructive",
    }
  }
  if (diffMs <= 2 * 60 * 60 * 1000) {
    return {
      label: "Sắp hết hạn",
      detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
      variant: "secondary",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    }
  }
  return {
    label: "Trong hạn",
    detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
    variant: "secondary",
  }
}

function durationLabel(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours} giờ`
  return `${Math.ceil(hours / 24)} ngày`
}

function completionTime(item: WorkItem) {
  if (item.completedAt) return formatDateTime(item.completedAt)
  if (item.status === "COMPLETED" || item.transactionStatus === "COMPLETED") {
    return formatDateTime(item.updatedAt)
  }
  return "-"
}

function previousAssignee(item: WorkItem) {
  const variables = item.variables ?? {}
  const value = variables.previousAssignee ?? variables.previousAssignedTo
  return typeof value === "string" && value ? value : "Chưa có"
}

function routeFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/incoming-transactions")) return "incoming"
  if (pathname.startsWith("/workbench/outgoing-transactions")) return "outgoing"
  if (pathname.startsWith("/workbench/transaction-search")) return "search"
  return "drafts"
}

function workItemHref(item: WorkItem, direction: WorkbenchDirection) {
  if (item.caseType === "CUSTOMER_REGISTRATION" && item.primaryObjectId) {
    const search = new URLSearchParams({
      customerId: item.primaryObjectId,
      caseId: item.caseId,
      caseCode: item.caseCode,
      taskKey: String(item.jobKey ?? ""),
      processInstanceKey: String(item.processInstanceKey ?? ""),
      elementId: item.stepCode,
      role: item.candidateRole ?? "",
    })
    return `/customers/registrations?${search.toString()}`
  }
  return caseCodeHref(direction, item.caseCode)
}

function apiDirection(direction: WorkbenchDirection): WorkbenchSearchDirection {
  return direction === "outgoing" ? "OUTGOING" : "INCOMING"
}

function caseCodeHref(direction: WorkbenchDirection, caseCode: string) {
  const path =
    direction === "outgoing"
      ? "/workbench/outgoing-transactions"
      : "/workbench/incoming-transactions"
  return `${path}?caseCode=${encodeURIComponent(caseCode)}`
}

function customerTypeLabel(item: Customer) {
  return item.customerType === "BUSINESS"
    ? "Khách hàng doanh nghiệp"
    : "Khách hàng cá nhân"
}

function stepLabel(value: string) {
  const labels: Record<string, string> = {
    submitted: "Đã gửi",
    Activity_CheckerReview: "Kiểm soát hồ sơ khách hàng",
    Activity_MakerRevise: "Maker bổ sung hồ sơ",
    Activity_RiskReview: "Rà soát rủi ro khách hàng",
    Activity_ApproveCustomer: "Kích hoạt hồ sơ khách hàng",
    "classify-account": "Phân loại tài khoản",
    "approve-journal": "Duyệt bút toán",
    "verify-beneficiary": "Kiểm tra người nhận",
    "workflow.finance_incoming_classify": "Phân loại giao dịch đến",
    "workflow.finance_incoming_approve": "Duyệt giao dịch đến",
    "workflow.finance_outgoing_verify": "Kiểm tra giao dịch đi",
    "workflow.finance_outgoing_approve": "Duyệt giao dịch đi",
    "workflow.hrm_registration_review": "Kiem tra ho so nhan su",
    "workflow.hrm_registration_approve": "Phe duyet tiep nhan nhan su",
  }
  return labels[value] ?? value
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
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

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
