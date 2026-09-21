import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { notify } from "@workspace/ui/feedback/notify"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { createActionsColumn } from "@workspace/list-page/table-columns"
import { deleteWorkingHour, listWorkingHours, upsertWorkingHour } from "./api"
import { type WorkingHour } from "./types"

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const DEFAULT_PAGE_SIZE = 10

function dayLabel(dayOfWeek: number) {
  return `platform.working_hours.day.${DAY_KEYS[dayOfWeek - 1] ?? "mon"}`
}

/**
 * Working hours (ca làm việc) — weekly shift editor (W6a).
 * `GET /api/platform/working-hours` is unpaged (full weekly grid), so this is
 * a client tier list: the org filter/sort/paging run in memory and stay
 * URL-synced through useClientListTable.
 */
export function WorkingHoursPage() {
  const { t } = useI18n()
  const [orgCode, setOrgCode] = useState("")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("17:00")
  const [breakMinutes, setBreakMinutes] = useState("60")
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState<WorkingHour | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkingHour | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [items, setItems] = useState<WorkingHour[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await listWorkingHours()
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const columns = useMemo<ColumnDef<WorkingHour>[]>(
    () => [
      {
        id: "day_of_week",
        accessorKey: "day_of_week",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.working_hours.field.day")}
          />
        ),
        cell: ({ row }) => t(dayLabel(row.original.day_of_week)),
      },
      {
        id: "org_code",
        accessorKey: "org_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.working_hours.field.org")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.working_hours.field.org"),
          t("platform.working_hours.placeholder.org")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.org_code || "—"}
          </span>
        ),
      },
      {
        id: "start_time",
        accessorKey: "start_time",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.working_hours.field.start")}
          />
        ),
        cell: ({ row }) => row.original.start_time,
      },
      {
        id: "end_time",
        accessorKey: "end_time",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.working_hours.field.end")}
          />
        ),
        cell: ({ row }) => row.original.end_time,
      },
      {
        id: "break_minutes",
        accessorKey: "break_minutes",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.working_hours.field.break")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.break_minutes}</span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("common.field.status"),
          t("platform.working_hours.active"),
          t("platform.working_hours.inactive")
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active
              ? t("platform.working_hours.active")
              : t("platform.working_hours.inactive")}
          </Badge>
        ),
      },
      createActionsColumn<WorkingHour>({
        onEdit: (row) => {
          setEditing(row)
          setOrgCode(row.org_code ?? "")
          setDayOfWeek(row.day_of_week)
          setStartTime(row.start_time)
          setEndTime(row.end_time)
          setBreakMinutes(String(row.break_minutes))
        },
        onDelete: (row) => setDeleteTarget(row),
        editTitle: t("common.action.edit"),
        deleteTitle: t("common.action.delete"),
        headerLabel: t("common.field.action"),
      }),
    ],
    [t]
  )

  const { table, total } = useClientListTable<WorkingHour>({
    columns,
    items,
    filterBy: {
      org_code: (item, value) => matchTextColumnFilter(value, item.org_code),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        day_of_week: (a, b) => a.day_of_week - b.day_of_week,
        org_code: (a, b) => (a.org_code ?? "").localeCompare(b.org_code ?? ""),
        start_time: (a, b) => a.start_time.localeCompare(b.start_time),
        end_time: (a, b) => a.end_time.localeCompare(b.end_time),
        break_minutes: (a, b) => a.break_minutes - b.break_minutes,
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const save = async () => {
    setPending(true)
    try {
      await upsertWorkingHour({
        id: editing?.id,
        org_code: orgCode || undefined,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        break_minutes: Number(breakMinutes) || 0,
        is_active: editing ? editing.is_active : true,
      })
      notify.success(t("platform.working_hours.save_success"))
      setEditing(null)
      await load()
    } catch {
      notify.error(t("platform.working_hours.save_failed"))
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteWorkingHour(deleteTarget.id)
      notify.success(t("platform.working_hours.delete_success"))
      setDeleteTarget(null)
      await load()
    } catch {
      notify.error(t("platform.working_hours.delete_failed"))
    } finally {
      setDeleting(false)
    }
  }

  const header = (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label>{t("platform.working_hours.field.org")}</Label>
        <Input
          value={orgCode}
          className="font-mono"
          onChange={(e) => setOrgCode(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("platform.working_hours.field.day")}</Label>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
        >
          {DAY_KEYS.map((key, index) => (
            <option key={key} value={index + 1}>
              {t(`platform.working_hours.day.${key}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("platform.working_hours.field.start")}</Label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("platform.working_hours.field.end")}</Label>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("platform.working_hours.field.break")}</Label>
        <Input
          inputMode="numeric"
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(e.target.value)}
        />
      </div>
      <Button onClick={() => void save()} disabled={pending}>
        {t("common.action.save")}
      </Button>
      {editing ? (
        <>
          <span className="pb-2 text-xs text-muted-foreground">
            {t("platform.working_hours.editing")}
          </span>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setEditing(null)
              setOrgCode("")
              setDayOfWeek(1)
              setStartTime("08:00")
              setEndTime("17:00")
              setBreakMinutes("60")
            }}
          >
            {t("common.action.cancel")}
          </Button>
        </>
      ) : null}
    </div>
  )

  return (
    <ListPageShell
      title={t("platform.working_hours.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("platform.working_hours.count", { count: total })}
        </Badge>
      }
      header={header}
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      loadErrorTitle={t("platform.working_hours.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("platform.working_hours.title")}
          sheetName={t("platform.working_hours.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("common.confirm.delete_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("common.confirm.delete_description", {
                  item: deleteTarget
                    ? `${t(dayLabel(deleteTarget.day_of_week))} ${deleteTarget.start_time}–${deleteTarget.end_time}`
                    : "",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {t("common.action.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    />
  )
}
