import type { ColumnDef } from "@tanstack/react-table"
import type { WorkItem, WorkbenchDirection } from "./api"
import { WorkItemCard } from "./work-item-card"
import { SlaStatus, StatusBadge, TimeProgress } from "./sla-utils"
import { completionTime, formatDateTime, previousAssignee } from "./step-labels"
import { getMediaContentUrl } from "@workspace/core/media/urls"

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
          <WorkItemCard item={row.original} claiming={claiming} onOpen={onOpen} />
        </div>
      ),
    },
  ]

  if (isIncoming) {
    cols.push(
      {
        id: "sla",
        header: "SLA",
        cell: ({ row }) => (
          <div className="min-w-32">
            <SlaStatus
              dueAt={row.original.slaDueAt}
              status={row.original.slaStatus}
            />
          </div>
        ),
      },
      {
        id: "progress",
        header: "Tiến độ",
        cell: ({ row }) => (
          <div className="min-w-44">
            <TimeProgress item={row.original} />
          </div>
        ),
      },
      {
        id: "assignee",
        header: "Người xử lý",
        cell: ({ row }) => (
          <div className="min-w-44">
            <AssigneeFlow item={row.original} />
          </div>
        ),
      }
    )
  } else {
    cols.push(
      {
        id: "completed",
        header: "Hoàn thành",
        cell: ({ row }) => (
          <div className="min-w-36 tabular-nums">
            {completionTime(row.original)}
          </div>
        ),
      },
      {
        id: "due",
        header: "Hạn xử lý",
        cell: ({ row }) => (
          <div className="min-w-36 tabular-nums">
            {formatDateTime(row.original.slaDueAt)}
          </div>
        ),
      },
      {
        id: "sla",
        header: "SLA",
        cell: ({ row }) => (
          <div className="min-w-32">
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
          <div className="min-w-36">{previousAssignee(row.original)}</div>
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
          <WorkItemCard item={row.original} claiming={false} onOpen={onOpen} />
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="min-w-32">
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
        <div className="min-w-36 tabular-nums">
          {formatDateTime(row.original.slaDueAt)}
        </div>
      ),
    },
    {
      id: "completed",
      header: "Hoàn thành",
      cell: ({ row }) => (
        <div className="min-w-36 tabular-nums">
          {completionTime(row.original)}
        </div>
      ),
    },
    {
      id: "sla",
      header: "SLA",
      cell: ({ row }) => (
        <div className="min-w-32">
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
      cell: ({ row }) => {
        const c = row.original
        const name = c.createdByName || displayNameFromId(c.createdBy ?? "")
        return (
          <div className="min-w-36">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground overflow-hidden">
                {c.createdByAvatar ? (
                  <img src={getMediaUrl(c.createdByAvatar)} alt="" className="size-full object-cover" />
                ) : (
                  (name || "?").charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate">{name || "-"}</span>
            </span>
          </div>
        )
      },
    },
  ]
}

function AssigneeFlow({ item }: { item: WorkItem }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1.5">
        {previousAssigneeDisplay(previousAssignee(item))}
        <span className="text-muted-foreground">→</span>
        {assigneeDisplay({ id: item.assignedTo, name: item.assignedToName, avatar: item.assignedToAvatar })}
      </div>
      <p className="text-muted-foreground">
        {item.candidateRole || "Chưa gán vai trò"}
      </p>
    </div>
  )
}

function assigneeDisplay(info: { id?: string | null; name?: string | null; avatar?: string | null }) {
  if (!info.id) return <span className="text-muted-foreground">Chưa nhận</span>
  const display = info.name || displayNameFromId(info.id)
  const initial = display.charAt(0).toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary overflow-hidden">
        {info.avatar ? (
          <img src={getMediaUrl(info.avatar)} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="truncate max-w-28">{display}</span>
    </span>
  )
}

function getMediaUrl(id: string): string {
  if (id.startsWith("http://") || id.startsWith("https://")) return id
  return getMediaContentUrl(id)
}

function previousAssigneeDisplay(name: string) {
  if (name === "Chưa có" || !name) {
    return <span className="text-muted-foreground">—</span>
  }
  const display = displayNameFromId(name)
  const initial = display.charAt(0).toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-medium">
        {initial}
      </span>
      <span className="truncate max-w-20">{display}</span>
    </span>
  )
}

function displayNameFromId(id: string) {
  const idx = id.indexOf("@")
  return idx > 0 ? id.slice(0, idx) : id
}
