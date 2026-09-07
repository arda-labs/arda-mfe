import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { Button } from "@workspace/ui/components/button"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import type { WorkflowRoleCatalog } from "../../api"
import { workflowApi } from "../../api"
import { RoleCatalogDialog } from "../../shared/admin-ui"
import {
  byString,
  statusFilterOptions,
  useTabList,
  WorkflowStatusCell,
  type CatalogSelectOption,
  type ProcessRolesTab,
} from "./tab-list"

/**
 * Role catalog tab. Its data doubles as the source of role-code options for
 * the membership/assignment/delegation tabs' dialogs.
 */
export function useCatalogTab(): ProcessRolesTab & { roleCodeOptions: CatalogSelectOption[] } {
  const { t } = useI18n()
  const [editing, setEditing] = useState<WorkflowRoleCatalog | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<WorkflowRoleCatalog>[]>(
    () => [
      {
        id: "cat_role_code",
        accessorKey: "roleCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.col_role_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.col_role_code"),
          t("workflow.process_roles.search_role_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.roleCode}</span>
        ),
      },
      {
        id: "cat_role_name",
        accessorKey: "roleName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.col_role_name")}
          />
        ),
      },
      {
        id: "cat_role_type",
        accessorKey: "roleType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.col_role_type")}
          />
        ),
      },
      {
        id: "cat_subsystem",
        accessorKey: "businessSubsystem",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.col_subsystem")}
          />
        ),
      },
      {
        id: "cat_status",
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
        id: "cat_actions",
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

  const { query, items, table, total } = useTabList<WorkflowRoleCatalog>({
    queryKey: ["workflow", "role-catalog", "all"],
    queryFn: () => workflowApi.listRoleCatalog(),
    columns,
    textFilterId: "cat_role_code",
    textFields: (item) => [item.roleCode, item.roleName],
    statusFilterId: "cat_status",
    sortFields: {
      cat_role_code: byString((item) => item.roleCode),
      cat_role_name: byString((item) => item.roleName),
      cat_role_type: byString((item) => item.roleType),
      cat_subsystem: byString((item) => item.businessSubsystem),
      cat_status: byString((item) => item.status),
    },
  })

  const roleCodeOptions = useMemo<CatalogSelectOption[]>(
    () =>
      items.map((item) => ({
        value: item.roleCode,
        label: `${item.roleCode} - ${item.roleName}`,
      })),
    [items]
  )
  const onSaved = () => void query.refetch()

  return {
    key: "catalog",
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
        createLabel={t("workflow.process_roles.create_catalog")}
        exportFilename={t("workflow.process_roles.tab_catalog")}
        sheetName={t("workflow.process_roles.tab_catalog")}
        totalRowsCount={total}
      />
    ),
    dialogs: (
      <>
        {createOpen ? (
          <RoleCatalogDialog open onOpenChange={setCreateOpen} onSaved={onSaved} />
        ) : null}
        {editing ? (
          <RoleCatalogDialog
            item={editing}
            open
            onOpenChange={(open) => !open && setEditing(null)}
            onSaved={onSaved}
          />
        ) : null}
      </>
    ),
    roleCodeOptions,
  }
}
