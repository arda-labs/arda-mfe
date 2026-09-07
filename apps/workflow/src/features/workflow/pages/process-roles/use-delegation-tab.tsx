import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { Button } from "@workspace/ui/components/button"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { useAuthStore } from "@workspace/auth"
import type { WorkflowDelegation } from "../../api"
import { workflowApi } from "../../api"
import { DelegationDialog } from "../../shared/admin-ui"
import {
  byString,
  statusFilterOptions,
  useTabList,
  WorkflowStatusCell,
  type CatalogSelectOption,
  type ProcessRolesTab,
} from "./tab-list"

export function useDelegationTab(
  roleCodeOptions: CatalogSelectOption[]
): ProcessRolesTab {
  const { t, formatDate } = useI18n()
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const [editing, setEditing] = useState<WorkflowDelegation | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<WorkflowDelegation>[]>(
    () => [
      {
        id: "dlg_role",
        accessorKey: "roleCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.delegation_col_role")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_roles.delegation_col_role"),
          t("workflow.process_roles.search_role_placeholder")
        ),
      },
      {
        id: "dlg_from",
        accessorKey: "fromPrincipalId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.delegation_col_from")}
          />
        ),
      },
      {
        id: "dlg_to",
        accessorKey: "toPrincipalId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.delegation_col_to")}
          />
        ),
      },
      {
        id: "dlg_effective",
        accessorKey: "effectiveFrom",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.delegation_col_effective")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.effectiveFrom
              ? formatDate(row.original.effectiveFrom, { dateStyle: "short" })
              : "-"}
            {" - "}
            {row.original.effectiveTo
              ? formatDate(row.original.effectiveTo, { dateStyle: "short" })
              : "..."}
          </span>
        ),
      },
      {
        id: "dlg_reason",
        accessorKey: "reason",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_roles.delegation_col_reason")}
          />
        ),
        enableSorting: false,
      },
      {
        id: "dlg_status",
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
        id: "dlg_actions",
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
    [formatDate, t]
  )

  const { query, table, total } = useTabList<WorkflowDelegation>({
    queryKey: ["workflow", "delegations", "all", tenantId],
    queryFn: () => workflowApi.listDelegations(tenantId),
    enabled: Boolean(tenantId),
    columns,
    textFilterId: "dlg_role",
    textFields: (item) => [item.roleCode, item.fromPrincipalId, item.toPrincipalId],
    statusFilterId: "dlg_status",
    sortFields: {
      dlg_role: byString((item) => item.roleCode),
      dlg_from: byString((item) => item.fromPrincipalId),
      dlg_to: byString((item) => item.toPrincipalId),
      dlg_effective: byString((item) => item.effectiveFrom ?? ""),
      dlg_status: byString((item) => item.status),
    },
  })

  const onSaved = () => void query.refetch()
  const dialogProps = { tenantId, roleOptions: roleCodeOptions, onSaved }

  return {
    key: "delegation",
    table,
    total,
    criticalPending: Boolean(tenantId) && query.isPending,
    criticalError: tenantId
      ? query.error
      : new Error(t("workflow.process_roles.tenant_missing")),
    onRetry: () => void query.refetch(),
    fetching: query.isFetching,
    countLabel: t("workflow.process_roles.count", { count: total }),
    toolbar: (
      <ListTableToolbar
        table={table}
        onCreate={() => setCreateOpen(true)}
        createLabel={t("workflow.process_roles.create_delegation")}
        exportFilename={t("workflow.process_roles.tab_delegation")}
        sheetName={t("workflow.process_roles.tab_delegation")}
        totalRowsCount={total}
      />
    ),
    dialogs: (
      <>
        {createOpen ? (
          <DelegationDialog open onOpenChange={setCreateOpen} {...dialogProps} />
        ) : null}
        {editing ? (
          <DelegationDialog
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
