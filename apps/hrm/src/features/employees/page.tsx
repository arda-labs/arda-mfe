import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta, multiSelectFilterMeta } from "@workspace/list-page/column-filters"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { hrmApi, type Employee, type JobTitle, type OrgUnit, type Position } from "../api"
import { employeesListDefinition } from "./list-query"
import { EmployeeFormDialog } from "./components/EmployeeFormDialog"

export function EmployeesPage() {
  const { t, formatDate } = useI18n()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  /** Client lookups for department/position/title name columns (small catalogs). */
  const orgUnits = useQuery({
    queryKey: ["hrm", "org-units", "lookup"],
    queryFn: () => hrmApi.listOrgUnits(),
    staleTime: 60_000,
  })
  const positions = useQuery({
    queryKey: ["hrm", "positions", "lookup"],
    queryFn: () => hrmApi.listPositions(),
    staleTime: 60_000,
  })
  const jobTitles = useQuery({
    queryKey: ["hrm", "job-titles", "lookup"],
    queryFn: () => hrmApi.listJobTitles(),
    staleTime: 60_000,
  })

  const lookupName = (
    items: Array<Pick<OrgUnit | Position | JobTitle, "id" | "name">>,
    id?: string
  ) => (id ? (items.find((item) => item.id === id)?.name ?? id) : "")

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: "employee_code",
        accessorKey: "employee_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.employee_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("hrm.employees.field.employee_code"),
          t("hrm.employees.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.employee_code}</span>
        ),
      },
      {
        id: "full_name",
        accessorKey: "full_name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.full_name")}
          />
        ),
      },
      {
        id: "department",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.department")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {lookupName(orgUnits.data ?? [], row.original.org_unit_id ?? undefined) || "-"}
          </span>
        ),
      },
      {
        id: "position",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.position")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {lookupName(positions.data ?? [], row.original.position_id ?? undefined) || "-"}
          </span>
        ),
      },
      {
        id: "job_title",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.job_title")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {lookupName(jobTitles.data ?? [], row.original.job_title_id ?? undefined) || "-"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.employees.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("hrm.employees.field.status"), [
          { label: t("hrm.status.active"), value: "active" },
          { label: t("hrm.status.inactive"), value: "inactive" },
        ]),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "active" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("hrm.status.active")
                : t("hrm.status.inactive")}
            </StatusLabel>
          </Status>
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
        cell: ({ row }) => formatDate(row.original.created_at ?? ""),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => {
                setEditTarget(row.original)
                setFormOpen(true)
              }}
              title={t("common.action.edit")}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
              onClick={() => setDeleteTarget(row.original)}
              title={t("common.action.delete")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [jobTitles.data, orgUnits.data, positions.data, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `employee_code`→q +
   * `status` filters <-> TanStack Query cache, cancellation, dedupe and
   * previous-page placeholder handled by @workspace/list-page. The page owns
   * columns, dialogs and the delete action only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Employee>({
    ...employeesListDefinition,
    columns,
    queryFn: async (query) =>
      hrmApi.listEmployees({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        sort: query.sort,
        order: query.order,
      }),
  })

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleDelete = useCallback(
    async (target: Employee) => {
      setDeleting(true)
      try {
        await hrmApi.deleteEmployee(target.id)
        notify.success(t("hrm.employees.delete_success"))
        setDeleteTarget(null)
        await refetch()
      } catch (err) {
        notify.error(t("hrm.employees.delete_failed"), translateApiError(err))
      } finally {
        setDeleting(false)
      }
    },
    [refetch, t]
  )

  const orgUnitOptions = useMemo(
    () =>
      (orgUnits.data ?? []).map((item) => ({
        id: item.id,
        label: `${item.code} - ${item.name}`,
      })),
    [orgUnits.data]
  )
  const positionOptions = useMemo(
    () =>
      (positions.data ?? []).map((item) => ({
        id: item.id,
        label: `${item.code} - ${item.name}`,
      })),
    [positions.data]
  )
  const jobTitleOptions = useMemo(
    () =>
      (jobTitles.data ?? []).map((item) => ({
        id: item.id,
        label: `${item.code} - ${item.name}`,
      })),
    [jobTitles.data]
  )

  return (
    <ListPageShell
      title={t("hrm.employees.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("hrm.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("hrm.employees.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("hrm.employees.create")}
          exportFilename={t("hrm.employees.title")}
          sheetName={t("hrm.employees.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <EmployeeFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            employee={editTarget}
            orgUnitOptions={orgUnitOptions}
            positionOptions={positionOptions}
            jobTitleOptions={jobTitleOptions}
            onSaved={() => void refetch()}
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
                    item:
                      deleteTarget?.full_name ||
                      deleteTarget?.employee_code ||
                      "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("common.action.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={() => deleteTarget && handleDelete(deleteTarget)}
                >
                  {t("common.action.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
