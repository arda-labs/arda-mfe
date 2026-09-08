import type { ColumnDef } from "@tanstack/react-table"
import type { WorkItem, WorkbenchDirection } from "../api"
import { WorkItemCard } from "../components/work-item-card"
import { SlaStatus, StatusBadge, TimeProgress } from "./sla-utils"
import { completionTime, formatDateTime, previousAssignee } from "./step-labels"
import { getMediaContentUrl } from "@workspace/media/urls"
import { useI18n } from "@workspace/i18n"

type TFn = ReturnType<typeof useI18n>["t"]

export function workItemColumns(
  direction: WorkbenchDirection,
  claiming: boolean,
  onOpen: (item: WorkItem) => void,
  t: TFn
): ColumnDef<WorkItem>[] {
  const isIncoming = direction === "incoming"
  const cols: ColumnDef<WorkItem>[] = [
    {
      id: "info",
      header: isIncoming
        ? t("workflow.workbench.col_transaction_info")
        : t("workflow.workbench.col_task_info"),
      size: 420,
      minSize: 280,
      maxSize: 560,
      cell: ({ row }) => (
        <div className="w-full max-w-md min-w-0 whitespace-normal">
          <WorkItemCard
            item={row.original}
            claiming={claiming}
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
        header: t("workflow.workbench.col_progress"),
        cell: ({ row }) => (
          <div className="min-w-44">
            <TimeProgress item={row.original} />
          </div>
        ),
      },
      {
        id: "assignee",
        header: t("workflow.workbench.col_assignee"),
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
        header: t("workflow.workbench.col_completed"),
        cell: ({ row }) => (
          <div className="min-w-36 tabular-nums">
            {completionTime(row.original)}
          </div>
        ),
      },
      {
        id: "due",
        header: t("workflow.workbench.col_due"),
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
        header: t("workflow.workbench.col_prev_assignee"),
        cell: ({ row }) => (
          <div className="min-w-36">
            {previousAssignee(row.original) ?? (
              <span className="text-muted-foreground">
                {"—"}
              </span>
            )}
          </div>
        ),
      }
    )
  }
  return cols
}

export function searchColumns(
  onOpen: (item: WorkItem) => void,
  t: TFn
): ColumnDef<WorkItem>[] {
  return [
    {
      id: "info",
      header: t("workflow.workbench.col_transaction_info"),
      size: 420,
      minSize: 280,
      maxSize: 560,
      cell: ({ row }) => (
        <div className="w-full max-w-md min-w-0 whitespace-normal">
          <WorkItemCard item={row.original} claiming={false} onOpen={onOpen} />
        </div>
      ),
    },
    {
      id: "status",
      header: t("workflow.workbench.col_status"),
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
      header: t("workflow.workbench.col_due"),
      cell: ({ row }) => (
        <div className="min-w-36 tabular-nums">
          {formatDateTime(row.original.slaDueAt)}
        </div>
      ),
    },
    {
      id: "completed",
      header: t("workflow.workbench.col_completed"),
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
      header: t("workflow.workbench.col_creator"),
      cell: ({ row }) => {
        const c = row.original
        const name = c.createdByName || displayNameFromId(c.createdBy ?? "")
        return (
          <div className="min-w-36">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[8px] font-medium text-muted-foreground">
                {c.createdByAvatar ? (
                  <img
                    src={getMediaUrl(c.createdByAvatar)}
                    alt=""
                    className="size-full object-cover"
                  />
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

export function AssigneeFlow({ item }: { item: WorkItem }) {
  const { t } = useI18n()
  const prev = previousAssignee(item)
  return (
    <div className="text-xs">
      <div className="flex items-center gap-1.5">
        {prev
          ? previousAssigneeDisplay({
              id: item.previousAssignedTo,
              name: prev,
              avatar: item.previousAssignedToAvatar,
            })
          : (
            <span className="text-muted-foreground">{"—"}</span>
          )}
        <span className="text-muted-foreground">→</span>
        {assigneeDisplay(
          {
            id: item.assignedTo,
            name: item.assignedToName,
            avatar: item.assignedToAvatar,
          },
          t
        )}
      </div>
    </div>
  )
}

function assigneeDisplay(
  info: {
    id?: string | null
    name?: string | null
    avatar?: string | null
  },
  t: TFn
) {
  if (!info.id)
    return (
      <span className="text-muted-foreground">
        {t("workflow.workbench.not_claimed")}
      </span>
    )
  const display = info.name || displayNameFromId(info.id)
  const initial = display.charAt(0).toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
        {info.avatar ? (
          <img
            src={getMediaUrl(info.avatar)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
      <span className="max-w-28 truncate">{display}</span>
    </span>
  )
}

function getMediaUrl(id: string): string {
  if (id.startsWith("http://") || id.startsWith("https://")) return id
  return getMediaContentUrl(id)
}

function previousAssigneeDisplay(info: {
  id?: string | null
  name?: string | null
  avatar?: string | null
}) {
  const name = info.name || ""
  if (!name) {
    return <span className="text-muted-foreground">—</span>
  }
  const display = displayNameFromId(name)
  const initial = display.charAt(0).toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[8px] font-medium">
        {info.avatar ? (
          <img
            src={getMediaUrl(info.avatar)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
      <span className="max-w-20 truncate">{display}</span>
    </span>
  )
}

function displayNameFromId(id: string) {
  const idx = id.indexOf("@")
  return idx > 0 ? id.slice(0, idx) : id
}
