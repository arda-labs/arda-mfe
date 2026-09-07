import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import {
  DataTableColumnHeader,
} from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import type { DescriptionTemplate } from "../api"
import { workflowApi } from "../api"
import {
  DescriptionTemplateDialog,
  businessSubsystemOptions,
  caseTypeOptionsFromCaseTypes,
} from "../shared/admin-ui"

const DEFAULT_PAGE_SIZE = 10

function subsystemLabel(value: string) {
  return (
    businessSubsystemOptions.find((option) => option.value === value)?.label ??
    value
  )
}

/** Description template catalog — small lookup, client tier. */
export function DescriptionTemplatesPage() {
  const { t } = useI18n()
  const [editing, setEditing] = useState<DescriptionTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const templateQuery = useQuery({
    queryKey: ["workflow", "description-templates", "all"],
    queryFn: () => workflowApi.listDescriptionTemplates(),
  })
  const caseTypeQuery = useQuery({
    queryKey: ["workflow", "case-types", "all"],
    queryFn: () => workflowApi.listCaseTypes(),
  })

  const items = templateQuery.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypeQuery.data ?? [])

  const columns = useMemo<ColumnDef<DescriptionTemplate>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.description_templates.col_code"),
          t("workflow.description_templates.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "business_subsystem",
        accessorKey: "businessSubsystem",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_subsystem")}
          />
        ),
        cell: ({ row }) => subsystemLabel(row.original.businessSubsystem),
      },
      {
        id: "case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_case_type")}
          />
        ),
      },
      {
        id: "pattern",
        accessorKey: "pattern",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_pattern")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="max-w-md font-mono text-xs">
            {row.original.pattern}
          </span>
        ),
      },
      {
        id: "preview",
        accessorKey: "preview",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_preview")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.preview}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.description_templates.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("workflow.description_templates.col_status"),
          variant: "multiSelect",
          options: [
            { label: t("workflow.status.active"), value: "ACTIVE" },
            { label: t("workflow.status.inactive"), value: "INACTIVE" },
          ],
        },
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "ACTIVE" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>{row.original.status || "-"}</StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("workflow.common_col_actions")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setEditing(row.original)}
              title={t("workflow.edit")}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<DescriptionTemplate>({
    columns,
    items,
    filterBy: {
      code: (item, value) =>
        matchTextColumnFilter(value, item.code, item.caseType),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        business_subsystem: (a, b) =>
          a.businessSubsystem.localeCompare(b.businessSubsystem),
        case_type: (a, b) => a.caseType.localeCompare(b.caseType),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogProps = {
    caseTypeOptions,
    subsystemOptions: businessSubsystemOptions,
    onSaved: () => void templateQuery.refetch(),
  }

  return (
    <ListPageShell
      title={t("workflow.description_templates.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("workflow.description_templates.count", { count: total })}
        </Badge>
      }
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("workflow.description_templates.description")}
        </p>
      }
      criticalPending={templateQuery.isPending || caseTypeQuery.isPending}
      criticalError={templateQuery.error ?? caseTypeQuery.error}
      onRetry={() => {
        void templateQuery.refetch()
        void caseTypeQuery.refetch()
      }}
      loadErrorTitle={t("workflow.description_templates.load_failed")}
      fetching={templateQuery.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("workflow.description_templates.create")}
          exportFilename={t("workflow.description_templates.title")}
          sheetName={t("workflow.description_templates.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          {createOpen ? (
            <DescriptionTemplateDialog
              open
              onOpenChange={setCreateOpen}
              {...dialogProps}
            />
          ) : null}
          {editing ? (
            <DescriptionTemplateDialog
              item={editing}
              open
              onOpenChange={(open) => !open && setEditing(null)}
              {...dialogProps}
            />
          ) : null}
        </>
      }
    />
  )
}
