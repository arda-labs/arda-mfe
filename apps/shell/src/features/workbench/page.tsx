import { useState, type ReactNode } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  Eye,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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
    <section className="space-y-4">
      <Header
        title="Hồ sơ nhập"
        description="Các bản nháp chưa submit vào BPMN. Khi trình duyệt thành công, hồ sơ sẽ thành case workflow."
      />
      <Panel
        title="Bản nháp nghiệp vụ"
        action={
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
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ma</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Nghiệp vụ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{customerTypeLabel(item)}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      navigateTo(
                        `/customers/registrations?customerId=${encodeURIComponent(item.id)}`
                      )
                    }
                  >
                    <Eye className="size-4" />
                    Mo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!items.length ? (
              <EmptyTable colSpan={6} text="Chưa có bản nháp nào." />
            ) : null}
          </TableBody>
        </Table>
      </Panel>
    </section>
  )
}

function TransactionWorkbench({
  direction,
}: {
  direction: WorkbenchDirection
}) {
  const meta = directionMeta[direction]
  const Icon = meta.icon
  const [filters, setFilters] = useState<WorkItemFilter>({
    direction: apiDirection(direction),
    accounting: "ALL",
    slaStatus: "ALL",
    limit: 100,
  })
  const [activeNode, setActiveNode] = useState("ALL")
  const queryFilter = {
    ...filters,
    node: activeNode === "ALL" ? undefined : activeNode,
  }
  const workItemsQuery = useWorkItems(queryFilter, { refetchInterval: 15000 })
  const summaryQuery = useWorkItemSummary(filters, { refetchInterval: 15000 })
  const claimWorkItem = useClaimWorkItem()
  const items = workItemsQuery.data ?? []
  const nodes = summaryQuery.data ?? []

  function updateFilter(patch: Partial<WorkItemFilter>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  function openWorkItem(item: WorkItem) {
    if (direction !== "incoming") {
      navigateTo(workItemHref(item, direction))
      return
    }
    if (item.assignedTo && !item.canOpen) {
      notify.error("Không thể nhận task", item.claimBlockedReason)
      return
    }
    if (item.canClaim) {
      claimWorkItem.mutate(
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
  }

  return (
    <section className="space-y-4">
      <Header title={meta.title} description={meta.description} />
      <Panel title="Điều kiện tìm kiếm">
        <WorkbenchFilters
          direction={direction}
          filters={filters}
          onChange={updateFilter}
        />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Panel title="Loại nghiệp vụ">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4" />
            <span>{items.length} việc</span>
          </div>
          <WorkItemTree
            nodes={nodes}
            activeNode={activeNode}
            onSelect={setActiveNode}
          />
        </Panel>
        <Panel
          title="Công việc cần xử lý"
          action={
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
        >
          <WorkItemTable
            variant={direction}
            items={items}
            claiming={direction === "incoming" && claimWorkItem.isPending}
            onOpen={openWorkItem}
          />
        </Panel>
      </div>
    </section>
  )
}

function TransactionSearchPage() {
  const [draft, setDraft] = useState<WorkItemFilter>({
    direction: "ALL",
    transactionStatus: "ALL",
    slaStatus: "ALL",
    limit: 100,
  })
  const [params, setParams] = useState<WorkItemFilter>(draft)
  const searchQuery = useWorkItems(params, { refetchInterval: 15000 })

  return (
    <section className="space-y-4">
      <Header
        title="Tìm kiếm giao dịch"
        description="Tra cứu giao dịch theo ngày, trạng thái xử lý và trạng thái SLA."
      />
      <form
        className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_12rem_12rem_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          setParams(draft)
        }}
      >
        <FormField label="Từ ngày">
          <Input
            type="date"
            value={draft.fromDate ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                fromDate: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Đến ngày">
          <Input
            type="date"
            value={draft.toDate ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                toDate: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Trạng thái giao dịch">
          <Select
            value={draft.transactionStatus ?? "ALL"}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                transactionStatus: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="SUBMITTED">Đã gửi</SelectItem>
              <SelectItem value="IN_REVIEW">Đang xử lý</SelectItem>
              <SelectItem value="COMPLETED">Hoàn tất</SelectItem>
              <SelectItem value="REJECTED">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Trạng thái SLA">
          <SlaFilterSelect
            value={draft.slaStatus ?? "ALL"}
            onChange={(slaStatus) =>
              setDraft((current) => ({ ...current, slaStatus }))
            }
          />
        </FormField>
        <Button className="mt-6" type="submit">
          <Search className="size-4" />
          Tìm
        </Button>
      </form>
      <Panel title="Kết quả">
        <WorkItemTable
          variant="search"
          items={searchQuery.data ?? []}
          claiming={false}
          onOpen={(item) =>
            navigateTo(
              workItemHref(
                item,
                item.direction === "OUTGOING" ? "outgoing" : "incoming"
              )
            )
          }
        />
      </Panel>
    </section>
  )
}

function WorkbenchFilters({
  direction,
  filters,
  onChange,
}: {
  direction: WorkbenchDirection
  filters: WorkItemFilter
  onChange: (patch: Partial<WorkItemFilter>) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <FormField label="Từ ngày">
        <Input
          type="date"
          value={filters.fromDate ?? ""}
          onChange={(event) => onChange({ fromDate: event.target.value })}
        />
      </FormField>
      <FormField label="Đến ngày">
        <Input
          type="date"
          value={filters.toDate ?? ""}
          onChange={(event) => onChange({ toDate: event.target.value })}
        />
      </FormField>
      {direction === "incoming" ? (
        <FormField label="Loại hạch toán">
          <Select
            value={filters.accounting ?? "ALL"}
            onValueChange={(accounting) =>
              onChange({
                accounting: accounting as WorkItemFilter["accounting"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="POSTED">Có hạch toán</SelectItem>
              <SelectItem value="NOT_POSTED">Không hạch toán</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      ) : (
        <FormField label="Trạng thái SLA">
          <SlaFilterSelect
            value={filters.slaStatus ?? "ALL"}
            onChange={(slaStatus) => onChange({ slaStatus })}
          />
        </FormField>
      )}
    </div>
  )
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
  return (
    <div className="space-y-1">
      {visibleNodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
            activeNode === node.id
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted"
          )}
          onClick={() => onSelect(node.id)}
        >
          <span className="truncate">{node.label}</span>
          <span className="flex items-center gap-1.5">
            {node.overdue ? (
              <Badge variant="destructive">{node.overdue}</Badge>
            ) : null}
            <Badge variant="secondary">{node.count}</Badge>
          </span>
        </button>
      ))}
    </div>
  )
}

function WorkItemTable({
  variant,
  items,
  claiming,
  onOpen,
}: {
  variant: WorkbenchDirection | "search"
  items: WorkItem[]
  claiming: boolean
  onOpen: (item: WorkItem) => void
}) {
  const isIncoming = variant === "incoming"
  const isOutgoing = variant === "outgoing"

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {isIncoming ? "Thông tin giao dịch" : "Thông tin tác vụ giao dịch"}
          </TableHead>
          {isIncoming ? (
            <>
              <TableHead>Trạng thái SLA</TableHead>
              <TableHead>Tiến độ thời gian</TableHead>
              <TableHead>Người xử lý</TableHead>
            </>
          ) : null}
          {isOutgoing ? (
            <>
              <TableHead>Thời gian hoàn thành</TableHead>
              <TableHead>Hạn xử lý</TableHead>
              <TableHead>Trạng thái SLA</TableHead>
              <TableHead>Người xử lý trước</TableHead>
            </>
          ) : null}
          {variant === "search" ? (
            <>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn xử lý</TableHead>
              <TableHead>Thời gian hoàn thành</TableHead>
              <TableHead>Trạng thái SLA</TableHead>
              <TableHead>Người tạo</TableHead>
            </>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer align-top"
            onClick={() => onOpen(item)}
          >
            <TableCell className="min-w-80">
              <WorkItemInfo
                item={item}
                claiming={claiming}
                forceOpen={variant !== "incoming"}
                onOpen={onOpen}
              />
            </TableCell>
            {isIncoming ? (
              <>
                <TableCell className="min-w-40">
                  <SlaStatus dueAt={item.slaDueAt} status={item.slaStatus} />
                </TableCell>
                <TableCell className="min-w-72">
                  <TimeProgress item={item} />
                </TableCell>
                <TableCell className="min-w-56">
                  <AssigneeFlow item={item} />
                </TableCell>
              </>
            ) : null}
            {isOutgoing ? (
              <>
                <TableCell className="min-w-40 tabular-nums">
                  {completionTime(item)}
                </TableCell>
                <TableCell className="min-w-40 tabular-nums">
                  {formatDateTime(item.slaDueAt)}
                </TableCell>
                <TableCell className="min-w-40">
                  <SlaStatus dueAt={item.slaDueAt} status={item.slaStatus} />
                </TableCell>
                <TableCell className="min-w-44">
                  {previousAssignee(item)}
                </TableCell>
              </>
            ) : null}
            {variant === "search" ? (
              <>
                <TableCell className="min-w-36">
                  <StatusBadge status={item.transactionStatus || item.status} />
                </TableCell>
                <TableCell className="min-w-40 tabular-nums">
                  {formatDateTime(item.slaDueAt)}
                </TableCell>
                <TableCell className="min-w-40 tabular-nums">
                  {completionTime(item)}
                </TableCell>
                <TableCell className="min-w-40">
                  <SlaStatus dueAt={item.slaDueAt} status={item.slaStatus} />
                </TableCell>
                <TableCell className="min-w-40">
                  {item.createdBy || "-"}
                </TableCell>
              </>
            ) : null}
          </TableRow>
        ))}
        {!items.length ? (
          <EmptyTable
            colSpan={isIncoming ? 4 : isOutgoing ? 5 : 6}
            text="Chưa có công việc phù hợp với điều kiện tìm kiếm."
          />
        ) : null}
      </TableBody>
    </Table>
  )
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

function SlaFilterSelect({
  value,
  onChange,
}: {
  value: NonNullable<WorkItemFilter["slaStatus"]>
  onChange: (value: NonNullable<WorkItemFilter["slaStatus"]>) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) =>
        onChange(next as NonNullable<WorkItemFilter["slaStatus"]>)
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Tất cả</SelectItem>
        <SelectItem value="MET">Đạt SLA</SelectItem>
        <SelectItem value="BREACHED">Không đạt SLA</SelectItem>
      </SelectContent>
    </Select>
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

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Header({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
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

function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  )
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

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
