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
import {
  textSearchMeta,
  multiSelectFilterMeta,
} from "@workspace/list-page/column-filters"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import {
  hrmApi,
  type OrgUnit,
  type PlatformOrganization,
} from "../api"
import { orgUnitsListDefinition } from "./list-query"
import { OrgUnitFormDialog } from "./components/OrgUnitFormDialog"

export function OrgUnitsPage() {
  const { t } = useI18n()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)
  const [deleting, setDeleting] = useState(false)

  /**
   * Client lookups (kept as-is per catalog standard): platform organizations
   * for the organization column/dialog and the full org-unit list for parent
   * names + parent selector — both are small, near-static catalogs.
   */
  const organizations = useQuery({
    queryKey: ["platform", "organizations", "lookup"],
    queryFn: () => hrmApi.listOrganizations(),
    staleTime: 60_000,
  })
  const orgUnitsLookup = useQuery({
    queryKey: ["hrm", "org-units", "lookup"],
    queryFn: () => hrmApi.listOrgUnits(),
    staleTime: 60_000,
  })

  const orgs: PlatformOrganization[] = organizations.data?.items ?? []

  const orgName = (id: string) => {
    const org = orgs.find((item) => item.id === id)
    return org ? `${org.code} - ${org.name}` : id
  }
  const parentName = (id?: string) =>
    id
      ? ((orgUnitsLookup.data ?? []).find((item) => item.id === id)?.name ?? id)
      : ""

  const columns = useMemo<ColumnDef<OrgUnit>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("hrm.org_units.field.code"),
          t("hrm.org_units.search_placeholder")
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
            label={t("hrm.org_units.field.name")}
          />
        ),
      },
      {
        id: "organization",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.organization")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {orgName(row.original.organization_id)}
          </span>
        ),
      },
      {
        id: "org_level",
        accessorKey: "org_level",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.org_level")}
          />
        ),
      },
      {
        id: "parent",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.parent")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {parentName(row.original.parent_id ?? undefined) || "-"}
          </span>
        ),
      },
      {
        id: "department_type",
        accessorKey: "department_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.department_type")}
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.org_units.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("hrm.org_units.field.status"), [
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
    [orgUnitsLookup.data, orgs, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q + `status`
   * filters <-> TanStack Query cache, cancellation, dedupe and previous-page
   * placeholder handled by @workspace/list-page. The page owns columns,
   * dialogs and the delete action only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<OrgUnit>({
    ...orgUnitsListDefinition,
    columns,
    queryFn: async (query) =>
      hrmApi.listOrgUnitsPaged({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status:
          query.status === undefined ? undefined : String(query.status),
        sort: query.sort,
        order: query.order,
      }),
  })

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleDelete = useCallback(
    async (target: OrgUnit) => {
      setDeleting(true)
      try {
        await hrmApi.deleteOrgUnit(target.id)
        notify.success(t("hrm.org_units.delete_success"))
        setDeleteTarget(null)
        await refetch()
      } catch (err) {
        notify.error(t("hrm.org_units.delete_failed"), translateApiError(err))
      } finally {
        setDeleting(false)
      }
    },
    [refetch, t]
  )

  return (
    <ListPageShell
      title={t("hrm.org_units.title")}
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
      loadErrorTitle={t("hrm.org_units.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("hrm.org_units.create")}
          exportFilename={t("hrm.org_units.title")}
          sheetName={t("hrm.org_units.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <OrgUnitFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            orgUnit={editTarget}
            organizations={orgs}
            orgUnits={orgUnitsLookup.data ?? []}
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
                    item: deleteTarget?.code || deleteTarget?.name || "",
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
