import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { uniqueOptions } from "../../shared/admin-ui"
import { Button } from "@workspace/ui/components/button"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import type { ProcessRole } from "../../api"
import { workflowApi } from "../../api"
import { ProcessRoleDialog } from "../../shared/admin-ui"
import {
  byString,
  statusFilterOptions,
  useTabList,
  WorkflowStatusCell,
  type CatalogSelectOption,
  type ProcessRolesTab,
} from "./tab-list"

export function useMappingTab(
  caseTypeOptions: CatalogSelectOption[],
  roleCodeOptions: CatalogSelectOption[]
): ProcessRolesTab {
  const { t } = useI18n()
  const [editing, setEditing] = useState<ProcessRole | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<ProcessRole>[]>(
    () => [
      {
        id: "map_case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.mapping_col_case_type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.mapping_col_case_type"),
          t("workflow.process_roles.search_case_type_placeholder")
        ),
      },
      {
        id: "map_step",
        accessorKey: "stepCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.mapping_col_step")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.mapping_col_step"),
          t("workflow.process_roles.search_step_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.stepCode}</span>
        ),
      },
      {
        id: "map_business_role",
        accessorKey: "businessRole",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.mapping_col_business_role")}
          />
        ),
      },
      {
        id: "map_iam_role",
        accessorKey: "iamRole",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.mapping_col_iam_role")}
          />
        ),
      },
      {
        id: "map_scope",
        accessorKey: "actionScope",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.mapping_col_scope")}
          />
        ),
      },
      {
        id: "map_status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("workflow.process_roles.col_status"),
          variant: "multiSelect",
          options: statusFilterOptions(t),
        },
        cell: ({ row }) => <WorkflowStatusCell status={row.original.status} />,
      },
      {
        id: "map_actions",
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

  const { query, items, table, total } = useTabList<ProcessRole>({
    queryKey: ["workflow", "process-roles", "all"],
    queryFn: () => workflowApi.listProcessRoles(),
    columns,
    textFilterId: "map_case_type",
    textFields: (item) => [item.caseType, item.stepCode, item.businessRole],
    statusFilterId: "map_status",
    sortFields: {
      map_case_type: byString((item) => item.caseType),
      map_step: byString((item) => item.stepCode),
      map_business_role: byString((item) => item.businessRole),
      map_iam_role: byString((item) => item.iamRole),
      map_scope: byString((item) => item.actionScope),
      map_status: byString((item) => item.status),
    },
  })

  const iamRoleOptions = useMemo(
    () => uniqueOptions(items.map((item) => item.iamRole), roleCodeOptions),
    [items, roleCodeOptions]
  )
  const onSaved = () => void query.refetch()
  const dialogProps = { caseTypeOptions, iamRoleOptions, onSaved }

  return {
    key: "mapping",
    table,
    total,
    criticalPending: query.isPending,
    criticalError: query.error,
    onRetry: () => void query.refetch(),
    fetching: query.isFetching,
    countLabel: t("workflow.process_roles.count", { count: total }),
    toolbar: (
      <ListTableToolbar
        table={table}
        onCreate={() => setCreateOpen(true)}
        createLabel={t("workflow.process_roles.create_mapping")}
        exportFilename={t("workflow.process_roles.tab_mapping")}
        sheetName={t("workflow.process_roles.tab_mapping")}
        totalRowsCount={total}
      />
    ),
    dialogs: (
      <>
        {createOpen ? (
          <ProcessRoleDialog
            open
            onOpenChange={setCreateOpen}
            {...dialogProps}
          />
        ) : null}
        {editing ? (
          <ProcessRoleDialog
            item={editing}
            open
            onOpenChange={(open) => !open && setEditing(null)}
            {...dialogProps}
          />
        ) : null}
      </>
    ),
  }
}
