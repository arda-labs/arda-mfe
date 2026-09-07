import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useAuthStore } from "@workspace/auth"
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
import type { WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
import {
  CaseTypeDialog,
  defaultBusinessAreaOptions,
  roleOptionsFromCaseTypes,
  uniqueOptions,
} from "../shared/admin-ui"

const DEFAULT_PAGE_SIZE = 10

/**
 * Case type catalog — small, near-static lookup (< ~500 rows), so the list
 * loads fully once and filters/sorts/paginates client-side (client tier).
 */
export function CaseTypesPage() {
  const { t } = useI18n()
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const [editing, setEditing] = useState<WorkflowCaseType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: items = [], isPending, isFetching, error, refetch } = useQuery({
    queryKey: ["workflow", "case-types", "all"],
    queryFn: () => workflowApi.listCaseTypes(),
  })

  const columns = useMemo<ColumnDef<WorkflowCaseType>[]>(
    () => [
      {
        id: "case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_case_type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.case_types.col_case_type"),
          t("workflow.case_types.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.caseType}</span>
        ),
      },
      {
        id: "business_area",
        accessorKey: "businessArea",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_business_area")}
          />
        ),
      },
      {
        id: "operation_name",
        accessorKey: "operationName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_operation_name")}
          />
        ),
      },
      {
        id: "owner_service",
        accessorKey: "ownerService",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_owner_service")}
          />
        ),
      },
      {
        id: "roles",
        accessorKey: "makerRole",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_roles")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.makerRole}
            <br />
            {row.original.checkerRole}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.case_types.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("workflow.case_types.col_status"),
          variant: "multiSelect",
          options: [
            { label: t("workflow.status.active"), value: "ACTIVE" },
            { label: t("workflow.status.draft"), value: "DRAFT" },
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

  const { table, total } = useClientListTable<WorkflowCaseType>({
    columns,
    items,
    filterBy: {
      case_type: (item, value) =>
        matchTextColumnFilter(value, item.caseType, item.operationName),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        case_type: (a, b) => a.caseType.localeCompare(b.caseType),
        business_area: (a, b) => a.businessArea.localeCompare(b.businessArea),
        operation_name: (a, b) =>
          a.operationName.localeCompare(b.operationName),
        owner_service: (a, b) => a.ownerService.localeCompare(b.ownerService),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const businessAreaOptions = uniqueOptions(
    items.map((item) => item.businessArea),
    defaultBusinessAreaOptions
  )
  const roleOptions = roleOptionsFromCaseTypes(items)
  const dialogProps = {
    tenantId,
    businessAreaOptions,
    roleOptions,
    onSaved: () => void refetch(),
  }

  return (
    <ListPageShell
      title={t("workflow.case_types.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("workflow.case_types.count", { count: total })}
        </Badge>
      }
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("workflow.case_types.description")}
        </p>
      }
      criticalPending={isPending}
      criticalError={error}
      onRetry={() => void refetch()}
      loadErrorTitle={t("workflow.case_types.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("workflow.case_types.create")}
          exportFilename={t("workflow.case_types.title")}
          sheetName={t("workflow.case_types.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          {createOpen ? (
            <CaseTypeDialog
              open
              onOpenChange={setCreateOpen}
              {...dialogProps}
            />
          ) : null}
          {editing ? (
            <CaseTypeDialog
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
