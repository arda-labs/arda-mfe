import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { apiUrl } from "@workspace/api/url"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
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
import { formatDateShort } from "@workspace/format"
import { statisticalApi, type FormTemplate } from "../api"
import { TemplateDialog } from "./components/template-dialog"

const DEFAULT_PAGE_SIZE = 10

/**
 * QCMS form templates (W5b): catalog + field builder + JSON export/import.
 * `GET /api/statistical/form-templates?include_inactive=true` returns the whole
 * catalog, so this is a client-tier list: search/sort/paging run in memory
 * behind the shared DataTable, URL-synced via useClientListTable. Per-row
 * actions keep the JSON export; import stays a toolbar action.
 */
export function FormsPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FormTemplate | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await statisticalApi.listFormTemplates(true)
      setItems(result.items)
    } catch (reason) {
      setItems([])
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const exportTemplate = useCallback(
    async (code: string) => {
      try {
        const response = await fetch(
          apiUrl(statisticalApi.formTemplateExportUrl(code)),
          { credentials: "include" }
        )
        if (!response.ok) throw new Error(String(response.status))
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `${code}.json`
        anchor.click()
        URL.revokeObjectURL(url)
      } catch {
        notify.error(t("statistical.forms.export_failed"))
      }
    },
    [t]
  )

  const importTemplate = async (file: File) => {
    try {
      const text = await file.text()
      await statisticalApi.importFormTemplate(JSON.parse(text))
      notify.success(t("statistical.forms.import_success"))
      await load()
    } catch {
      notify.error(t("statistical.forms.import_failed"))
    }
  }

  const columns = useMemo<ColumnDef<FormTemplate>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.code"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.name")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "workflow_case_type",
        accessorKey: "workflow_case_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.forms.field.case_type")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.workflow_case_type || "—"}
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
          t("statistical.catalogs.active"),
          t("statistical.catalogs.inactive")
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active
              ? t("statistical.catalogs.active")
              : t("statistical.catalogs.inactive")}
          </Badge>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => void exportTemplate(row.original.code)}
            >
              {t("statistical.forms.export")}
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                setEditTarget(row.original)
                setFormOpen(true)
              }}
            >
              {t("common.action.edit")}
            </button>
          </div>
        ),
      },
    ],
    [exportTemplate, t]
  )

  const { table, total } = useClientListTable<FormTemplate>({
    columns,
    items,
    filterBy: {
      code: (item, value) =>
        matchTextColumnFilter(value, item.code, item.name),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        workflow_case_type: (a, b) =>
          (a.workflow_case_type ?? "").localeCompare(
            b.workflow_case_type ?? ""
          ),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
        created_at: (a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("statistical.forms.title")}
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("statistical.forms.description")}
        </p>
      }
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("statistical.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      loadErrorTitle={t("statistical.forms.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
          createLabel={t("statistical.forms.create")}
          exportFilename={t("statistical.forms.title")}
          sheetName={t("statistical.forms.title")}
          totalRowsCount={total}
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importTemplate(file)
              event.target.value = ""
            }}
          />
          <Button
            variant="outline"
            className="h-8 px-3 text-xs font-semibold"
            onClick={() => fileInput.current?.click()}
          >
            {t("statistical.forms.import")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={
        <TemplateDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          template={editTarget}
          onSaved={() => load()}
        />
      }
    />
  )
}
