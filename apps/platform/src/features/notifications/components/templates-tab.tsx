import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
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
import { DataTable } from "@workspace/ui/components/data-table/data-table"
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
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { PageLoadOverlay } from "@workspace/list-page/page-load-overlay"
import {
  deleteNotificationTemplate,
  listNotificationTemplates,
  testSendNotification,
} from "../api"
import { type NotificationTemplate } from "../types"
import { TemplateDialog } from "./template-dialog"

const DEFAULT_PAGE_SIZE = 10

/** Templates tab: list + create/edit dialog + delete + test send. */
export function TemplatesTab() {
  const { t } = useI18n()
  const [items, setItems] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [testEventCode, setTestEventCode] = useState("")
  const [testRecipient, setTestRecipient] = useState("")
  const [testParams, setTestParams] = useState("")
  const [testing, setTesting] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      setItems(await listNotificationTemplates())
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

  const columns = useMemo<ColumnDef<NotificationTemplate>[]>(
    () => [
      {
        id: "event_code",
        accessorKey: "event_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.notifications.field.event_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.notifications.field.event_code"),
          t("platform.notifications.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.event_code}
          </span>
        ),
      },
      {
        id: "channel",
        accessorKey: "channel",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.notifications.field.channel")}
          />
        ),
        cell: ({ row }) => row.original.channel,
      },
      {
        id: "locale",
        accessorKey: "locale",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.notifications.field.locale")}
          />
        ),
        cell: ({ row }) => row.original.locale,
      },
      {
        id: "subject",
        accessorKey: "subject",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.notifications.field.subject")}
          />
        ),
        cell: ({ row }) => (
          <span
            className="block max-w-[280px] truncate"
            title={row.original.subject || undefined}
          >
            {row.original.subject || "—"}
          </span>
        ),
      },
      {
        id: "design_code",
        accessorKey: "design_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.notifications.field.design_code")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.design_code || "—"}
          </span>
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
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title={t("common.action.edit")}
              onClick={() => {
                setEditing(row.original)
                setDialogOpen(true)
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
              title={t("common.action.delete")}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<NotificationTemplate>({
    columns,
    items,
    filterBy: {
      event_code: (item, value) =>
        matchTextColumnFilter(value, item.event_code, item.subject),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        event_code: (a, b) => a.event_code.localeCompare(b.event_code),
        channel: (a, b) => a.channel.localeCompare(b.channel),
        locale: (a, b) => a.locale.localeCompare(b.locale),
        subject: (a, b) => a.subject.localeCompare(b.subject),
        design_code: (a, b) => a.design_code.localeCompare(b.design_code),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const sendTest = async () => {
    if (!testEventCode.trim() || !testRecipient.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    let params: Record<string, unknown> = {}
    if (testParams.trim()) {
      try {
        params = JSON.parse(testParams) as Record<string, unknown>
      } catch {
        notify.error(t("platform.notifications.test.invalid_params"))
        return
      }
    }
    setTesting(true)
    try {
      await testSendNotification({
        event_code: testEventCode.trim(),
        recipient: testRecipient.trim(),
        locale: "vi-VN",
        params,
      })
      notify.success(t("platform.notifications.test.success"))
    } catch (reason) {
      notify.error(
        t("platform.notifications.test.failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteNotificationTemplate(deleteTarget.id)
      notify.success(t("platform.notifications.delete_success"))
      setDeleteTarget(null)
      await load()
    } catch {
      notify.error(t("platform.notifications.delete_failed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("platform.notifications.template.hint")}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          {t("common.action.create")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.event_code")}</Label>
          <Input
            className="font-mono"
            value={testEventCode}
            onChange={(e) => setTestEventCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.test.recipient")}</Label>
          <Input
            value={testRecipient}
            placeholder="user@example.com"
            onChange={(e) => setTestRecipient(e.target.value)}
          />
        </div>
        <div className="min-w-[200px] space-y-1.5">
          <Label>{t("platform.notifications.test.params")}</Label>
          <Input
            className="font-mono text-xs"
            value={testParams}
            placeholder='{"caseCode":"X"}'
            onChange={(e) => setTestParams(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void sendTest()}
          disabled={testing}
        >
          {t("platform.notifications.test.send")}
        </Button>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span>{t("platform.notifications.load_failed")}</span>
          <Button variant="outline" size="sm" onClick={() => void load(true)}>
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="relative">
        <DataTable table={table} totalRows={total} fetching={refreshing}>
          <ListTableToolbar
            table={table}
            exportFilename={t("platform.notifications.tab.templates")}
            sheetName={t("platform.notifications.tab.templates")}
            totalRowsCount={total}
          />
        </DataTable>
        {loading ? <PageLoadOverlay /> : null}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => load()}
      />

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
                item: deleteTarget?.event_code ?? "",
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
    </div>
  )
}
