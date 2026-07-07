import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@workspace/ui/components/badge"
import type { WorkItem, WorkbenchDirection } from "./api"
import { WorkItemCard } from "./work-item-card"
import { SlaStatus, StatusBadge, TimeProgress } from "./sla-utils"
import { completionTime, formatDateTime, previousAssignee } from "./step-labels"

export function workItemColumns(
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
          <WorkItemCard
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

export function searchColumns(
  onOpen: (item: WorkItem) => void
): ColumnDef<WorkItem>[] {
  return [
    {
      id: "info",
      header: "Thông tin giao dịch",
      cell: ({ row }) => (
        <div className="min-w-80">
          <WorkItemCard
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
