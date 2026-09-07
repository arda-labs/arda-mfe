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
import type { SlaPolicy, WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
import {
  ProcessConfigDialog,
  roleOptionsFromCaseTypes,
} from "../shared/admin-ui"

const DEFAULT_PAGE_SIZE = 10

/**
 * Process configuration — edit-only by design (mapping lives on the case type
 * itself), so no create/delete actions here. Small lookup, client tier.
 */
export function ProcessConfigsPage() {
  const { t } = useI18n()
  const [editing, setEditing] = useState<WorkflowCaseType | null>(null)

  const caseTypeQuery = useQuery({
    queryKey: ["workflow", "case-types", "all"],
    queryFn: () => workflowApi.listCaseTypes(),
  })
  const slaQuery = useQuery({
    queryKey: ["workflow", "sla-policies", "all"],
    queryFn: () => workflowApi.listSlaPolicies(),
  })

  const items = caseTypeQuery.data ?? []
  const slaOptions = (slaQuery.data ?? []).map((item: SlaPolicy) => ({
    value: item.id,
    label: `${item.code} - ${item.name}`,
    description: item.caseType,
  }))

  const columns = useMemo<ColumnDef<WorkflowCaseType>[]>(
    () => [
      {
        id: "case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_configs.col_case_type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_configs.col_case_type"),
          t("workflow.process_configs.search_placeholder")
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
            label={t("workflow.process_configs.col_business_area")}
          />
        ),
      },
      {
        id: "operation_name",
        accessorKey: "operationName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_configs.col_operation_name")}
          />
        ),
      },
      {
        id: "process",
        accessorKey: "bpmnProcessId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_configs.col_process")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.bpmnProcessId} / v{row.original.bpmnVersion}
          </span>
        ),
      },
      {
        id: "roles",
        accessorKey: "makerRole",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_configs.col_roles")}
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
            label={t("workflow.process_configs.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("workflow.process_configs.col_status"),
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
        process: (a, b) => a.bpmnProcessId.localeCompare(b.bpmnProcessId),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("workflow.process_configs.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("workflow.process_configs.count", { count: total })}
        </Badge>
      }
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("workflow.process_configs.description")}
        </p>
      }
      criticalPending={caseTypeQuery.isPending || slaQuery.isPending}
      criticalError={caseTypeQuery.error ?? slaQuery.error}
      onRetry={() => {
        void caseTypeQuery.refetch()
        void slaQuery.refetch()
      }}
      loadErrorTitle={t("workflow.process_configs.load_failed")}
      fetching={caseTypeQuery.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("workflow.process_configs.title")}
          sheetName={t("workflow.process_configs.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        editing ? (
          <ProcessConfigDialog
            item={editing}
            roleOptions={roleOptionsFromCaseTypes(items)}
            slaOptions={slaOptions}
            onOpenChange={(open) => !open && setEditing(null)}
            key={editing.caseType}
          />
        ) : null
      }
    />
  )
}
