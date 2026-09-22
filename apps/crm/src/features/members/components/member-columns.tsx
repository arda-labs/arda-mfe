import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { multiSelectFilterMeta, textSearchMeta } from "@workspace/list-page/column-filters"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { Wallet } from "lucide-react"
import type { CrmMember } from "../../api"
import { formatMinor, memberStatusLabel, memberTypeLabel } from "./member-labels"

export interface MemberColumnOption {
  value: string
  label: string
  count?: number
}

/** Column defs for the QTDND member register (`/customers/members`). */
export function useMemberColumns({
  typeOptions,
  statusOptions,
  onCapital,
}: {
  typeOptions: MemberColumnOption[]
  statusOptions: MemberColumnOption[]
  onCapital: (member: CrmMember) => void
}): ColumnDef<CrmMember>[] {
  const { t } = useI18n()

  return useMemo<ColumnDef<CrmMember>[]>(
    () => [
      {
        id: "member_code",
        accessorKey: "member_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("members.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("members.field.code"), t("members.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.member_code}
          </span>
        ),
      },
      {
        id: "customer_code",
        accessorKey: "customer_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("members.field.customer")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("members.field.customer"), t("members.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.customer_code}</span>
        ),
      },
      {
        id: "member_type_code",
        accessorKey: "member_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("members.field.type")} />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("members.field.type"), typeOptions),
        cell: ({ row }) => (
          <span className="text-xs">{memberTypeLabel(t, row.original.member_type_code)}</span>
        ),
      },
      {
        id: "open_date",
        accessorKey: "open_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("members.field.openDate")} />
        ),
        cell: ({ row }) => <span className="text-xs">{row.original.open_date}</span>,
      },
      {
        id: "total_capital_minor",
        accessorKey: "total_capital_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("members.field.capital")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {formatMinor(row.original.total_capital_minor)}
          </span>
        ),
      },
      {
        id: "member_status",
        accessorKey: "member_status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("common.field.status"), statusOptions),
        cell: ({ row }) => (
          <Badge variant={row.original.member_status === "ACTIVE" ? "default" : "outline"}>
            {memberStatusLabel(t, row.original.member_status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.field.action")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              title={t("members.capital.title")}
              aria-label={t("members.capital.title")}
              onClick={() => onCapital(row.original)}
            >
              <Wallet className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onCapital, statusOptions, t, typeOptions]
  )
}
