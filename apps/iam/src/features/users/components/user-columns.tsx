import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { multiSelectFilterMeta, textSearchMeta } from "@workspace/list-page/column-filters"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import type { User } from "../types"
import { UserRowActions, type UserRowActionHandlers } from "./UserRowActions"

/** Column definitions for the users server list (shared sort/filter meta). */
export function useUserColumns(
  handlers: UserRowActionHandlers
): ColumnDef<User>[] {
  const { t, formatDate } = useI18n()

  return useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "username",
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.users.field.username")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          ...textSearchMeta(t("admin.users.field.username"), t("admin.users.search")),
          exportValue: (user: User) => user.username || user.email || "-",
        },
        cell: ({ row }) => {
          const user = row.original
          const displayName =
            user.name ||
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.nickname
          return (
            <div>
              <div className="font-medium text-foreground">
                {user.username || user.email || "-"}
              </div>
              {displayName ? (
                <div className="text-xs text-muted-foreground">
                  {displayName}
                </div>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.email")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
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
        meta: {
          ...multiSelectFilterMeta(t("common.field.status"), [
            { label: t("admin.users.status.active"), value: "ACTIVE" },
            { label: t("admin.users.status.disabled"), value: "DISABLED" },
          ]),
          exportValue: (user: User) =>
            user.status === "ACTIVE"
              ? t("admin.users.status.active")
              : t("admin.users.status.disabled"),
        },
        cell: ({ row }) => {
          const active = row.original.status === "ACTIVE"
          return (
            <Status variant={active ? "success" : "default"}>
              <StatusIndicator />
              <StatusLabel>
                {active
                  ? t("admin.users.status.active")
                  : t("admin.users.status.disabled")}
              </StatusLabel>
            </Status>
          )
        },
      },
      {
        id: "roles",
        header: () => t("admin.users.field.roles"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <Badge key={role} variant="outline" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        ),
        enableSorting: false,
        meta: {
          exportValue: (user: User) => (user.roles || []).join(", "),
        },
      },
      {
        id: "created_at",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdAt ? formatDate(row.original.createdAt) : "-"}
          </span>
        ),
        meta: {
          exportValue: (user: User) =>
            user.createdAt ? formatDate(user.createdAt) : "-",
        },
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => (
          <UserRowActions user={row.original} handlers={handlers} />
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [formatDate, handlers, t]
  )
}
