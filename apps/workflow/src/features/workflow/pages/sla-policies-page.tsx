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
import type { SlaPolicy } from "../api"
import { workflowApi } from "../api"
import { SlaPolicyDialog, caseTypeOptionsFromCaseTypes } from "../shared/admin-ui"

const DEFAULT_PAGE_SIZE = 10

/** SLA policy catalog — small lookup, client tier; case types feed the dialog. */
export function SlaPoliciesPage() {
  const { t, formatDate } = useI18n()
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const slaQuery = useQuery({
    queryKey: ["workflow", "sla-policies", "all"],
    queryFn: () => workflowApi.listSlaPolicies(),
  })
  const caseTypeQuery = useQuery({
    queryKey: ["workflow", "case-types", "all"],
    queryFn: () => workflowApi.listCaseTypes(),
  })

  const items = useMemo(() => slaQuery.data ?? [], [slaQuery.data])
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypeQuery.data ?? [])

  const columns = useMemo<ColumnDef<SlaPolicy>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.sla_policies.col_code"),
          t("workflow.sla_policies.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_name")}
          />
        ),
      },
      {
        id: "case_type",
        accessorKey: "caseType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_case_type")}
          />
        ),
      },
      {
        id: "due",
        accessorKey: "dueInHours",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_due")}
          />
        ),
        cell: ({ row }) =>
          t("workflow.sla_policies.due_hours", {
            hours: row.original.dueInHours,
          }),
      },
      {
        id: "warning",
        accessorKey: "warningInHours",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_warning")}
          />
        ),
        cell: ({ row }) =>
          t("workflow.sla_policies.warning_hours", {
            hours: row.original.warningInHours,
          }),
      },
      {
        id: "tasks",
        accessorKey: "taskPolicies",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_tasks")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => row.original.taskPolicies?.length ?? 0,
      },
      {
        id: "effective",
        accessorKey: "effectiveFrom",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_effective")}
          />
        ),
        cell: ({ row }) =>
          row.original.effectiveFrom
            ? formatDate(row.original.effectiveFrom, { dateStyle: "short" })
            : "-",
      },
      {
        id: "escalation_role",
        accessorKey: "escalationRole",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_escalation_role")}
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.sla_policies.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("workflow.sla_policies.col_status"),
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
    [formatDate, t]
  )

  const { table, total } = useClientListTable<SlaPolicy>({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code, item.name),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        case_type: (a, b) => a.caseType.localeCompare(b.caseType),
        due: (a, b) => a.dueInHours - b.dueInHours,
        warning: (a, b) => a.warningInHours - b.warningInHours,
        effective: (a, b) =>
          (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? ""),
        escalation_role: (a, b) =>
          a.escalationRole.localeCompare(b.escalationRole),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const roleOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.escalationRole))]
        .filter(Boolean)
        .map((role) => ({ value: role, label: role })),
    [items]
  )
  const dialogProps = {
    caseTypeOptions,
    roleOptions,
    onSaved: () => void slaQuery.refetch(),
  }

  return (
    <ListPageShell
      title={t("workflow.sla_policies.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("workflow.sla_policies.count", { count: total })}
        </Badge>
      }
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("workflow.sla_policies.description")}
        </p>
      }
      criticalPending={slaQuery.isPending || caseTypeQuery.isPending}
      criticalError={slaQuery.error ?? caseTypeQuery.error}
      onRetry={() => {
        void slaQuery.refetch()
        void caseTypeQuery.refetch()
      }}
      loadErrorTitle={t("workflow.sla_policies.load_failed")}
      fetching={slaQuery.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("workflow.sla_policies.create")}
          exportFilename={t("workflow.sla_policies.title")}
          sheetName={t("workflow.sla_policies.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          {createOpen ? (
            <SlaPolicyDialog
              open
              onOpenChange={setCreateOpen}
              {...dialogProps}
            />
          ) : null}
          {editing ? (
            <SlaPolicyDialog
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
