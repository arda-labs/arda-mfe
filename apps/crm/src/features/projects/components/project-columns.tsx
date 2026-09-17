import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import {
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { Pencil, Users } from "lucide-react"
import type { CrmProject } from "../../api"

export interface ProjectColumnOption {
  value: string
  label: string
  count?: number
}

type TranslateFn = (key: string) => string

/** Status labels come from the project row (free-form VARCHAR), so only the
 * canonical values are translated and the rest are shown verbatim. */
export function projectStatusLabel(t: TranslateFn, status: string) {
  if (status === "ACTIVE") return t("common.status.active")
  if (status === "INACTIVE") return t("common.status.inactive")
  return status
}

/** Column defs for the CRM project catalog (`/customers/projects`) — client tier. */
export function useProjectColumns({
  typeOptions,
  statusOptions,
  onEdit,
  onOpenMembers,
}: {
  typeOptions: ProjectColumnOption[]
  statusOptions: ProjectColumnOption[]
  onEdit: (project: CrmProject) => void
  onOpenMembers: (project: CrmProject) => void
}): ColumnDef<CrmProject>[] {
  const { t } = useI18n()

  return useMemo<ColumnDef<CrmProject>[]>(
    () => [
      {
        id: "project_code",
        accessorKey: "project_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.projects.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("crm.projects.field.code"),
          t("crm.projects.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.project_code}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.name"),
          t("crm.projects.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "type_code",
        accessorKey: "type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.projects.field.type")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("crm.projects.field.type"), typeOptions),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.type_code}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("common.field.status"),
          statusOptions
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "ACTIVE" ? "default" : "outline"}
          >
            {projectStatusLabel(t, row.original.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              title={t("common.action.edit")}
              aria-label={t("common.action.edit")}
              onClick={() => onEdit(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              title={t("crm.projects.members")}
              aria-label={t("crm.projects.members")}
              onClick={() => onOpenMembers(row.original)}
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onOpenMembers, statusOptions, t, typeOptions]
  )
}
