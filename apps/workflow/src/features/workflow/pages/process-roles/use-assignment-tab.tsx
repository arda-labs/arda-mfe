import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { Button } from "@workspace/ui/components/button"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import type { WorkflowAssignmentRule } from "../../api"
import { workflowApi } from "../../api"
import { AssignmentRuleDialog } from "../../shared/admin-ui"
import {
  byNumber,
  byString,
  statusFilterOptions,
  useTabList,
  WorkflowStatusCell,
  type CatalogSelectOption,
  type ProcessRolesTab,
} from "./tab-list"

export function useAssignmentTab(
  caseTypeOptions: CatalogSelectOption[],
  roleCodeOptions: CatalogSelectOption[]
): ProcessRolesTab {
  const { t } = useI18n()
  const [editing, setEditing] = useState<WorkflowAssignmentRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<WorkflowAssignmentRule>[]>(
    () => [
      {
        id: "asg_case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_case_type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.assignment_col_case_type"),
          t("workflow.process_roles.search_case_type_placeholder")
        ),
      },
      {
        id: "asg_step",
        accessorKey: "stepCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_step")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.assignment_col_step"),
          t("workflow.process_roles.search_step_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.stepCode}</span>
        ),
      },
      {
        id: "asg_role",
        accessorKey: "roleCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_role")}
          />
        ),
      },
      {
        id: "asg_mode",
        accessorKey: "assignmentMode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_mode")}
          />
        ),
      },
      {
        id: "asg_sod",
        accessorKey: "requireSeparationOfDuties",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_sod")}
          />
        ),
        cell: ({ row }) =>
          row.original.requireSeparationOfDuties
            ? t("workflow.process_roles.assignment_sod_required")
            : t("workflow.process_roles.assignment_sod_optional"),
      },
      {
        id: "asg_fallback",
        accessorKey: "fallbackRoleCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_fallback")}
          />
        ),
        cell: ({ row }) => row.original.fallbackRoleCode || "-",
      },
      {
        id: "asg_priority",
        accessorKey: "priority",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.assignment_col_priority")}
          />
        ),
      },
      {
        id: "asg_status",
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
        id: "asg_actions",
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

  const { query, table, total } = useTabList<WorkflowAssignmentRule>({
    queryKey: ["workflow", "assignment-rules", "all"],
    queryFn: () => workflowApi.listAssignmentRules(),
    columns,
    textFilterId: "asg_case_type",
    textFields: (item) => [item.caseType, item.stepCode, item.roleCode],
    statusFilterId: "asg_status",
    sortFields: {
      asg_case_type: byString((item) => item.caseType),
      asg_step: byString((item) => item.stepCode),
      asg_role: byString((item) => item.roleCode),
      asg_mode: byString((item) => item.assignmentMode),
      asg_priority: byNumber((item) => item.priority),
      asg_status: byString((item) => item.status),
    },
  })

  const onSaved = () => void query.refetch()
  const dialogProps = { caseTypeOptions, roleOptions: roleCodeOptions, onSaved }

  return {
    key: "assignment",
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
        createLabel={t("workflow.process_roles.create_assignment")}
        exportFilename={t("workflow.process_roles.tab_assignment")}
        sheetName={t("workflow.process_roles.tab_assignment")}
        totalRowsCount={total}
      />
    ),
    dialogs: (
      <>
        {createOpen ? (
          <AssignmentRuleDialog
            open
            onOpenChange={setCreateOpen}
            {...dialogProps}
          />
        ) : null}
        {editing ? (
          <AssignmentRuleDialog
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
