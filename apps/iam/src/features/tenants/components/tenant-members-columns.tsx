import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import type { User } from "../../users/types"
import type { TenantMember } from "../types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Trash2 } from "lucide-react"

export function memberLabel(member: TenantMember) {
  return member.displayName || member.username || member.email || "-"
}

export function userLabel(user: User) {
  return user.name || user.username || user.email || "-"
}

function statusBadge(
  status: string,
  activeLabel: string,
  disabledLabel: string
) {
  return (
    <Status variant={status === "ACTIVE" ? "success" : "default"}>
      <StatusIndicator />
      <StatusLabel>
        {status === "ACTIVE" ? activeLabel : disabledLabel}
      </StatusLabel>
    </Status>
  )
}

function userNameCell(name: string, username: string) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{name}</div>
      {username ? (
        <div className="truncate font-mono text-xs text-muted-foreground">
          {username}
        </div>
      ) : null}
    </div>
  )
}

type UseTenantMemberColumnsParams = {
  selectedIds: Set<string>
  allSelected: boolean
  someSelected: boolean
  busy: boolean
  onToggle: (userId: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onRequestRemove: (userId: string) => void
}

export function useTenantMemberColumns({
  selectedIds,
  allSelected,
  someSelected,
  busy,
  onToggle,
  onToggleAll,
  onRequestRemove,
}: UseTenantMemberColumnsParams) {
  const { t } = useI18n()

  return useMemo<ColumnDef<TenantMember>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              allSelected ? true : someSelected ? "indeterminate" : false
            }
            onCheckedChange={(value) => onToggleAll(value === true)}
            aria-label={t("common.action.select_all")}
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.userId)}
            onCheckedChange={(value) =>
              onToggle(row.original.userId, value === true)
            }
            aria-label={t("iam.tenants.members.select_for_remove", {
              user: memberLabel(row.original),
            })}
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "member",
        header: () => t("iam.tenants.members.column.member"),
        cell: ({ row }) =>
          userNameCell(memberLabel(row.original), row.original.username),
      },
      {
        accessorKey: "email",
        header: () => t("common.field.email"),
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {row.original.email || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: () => t("common.field.status"),
        cell: ({ row }) =>
          statusBadge(
            row.original.status,
            t("admin.users.status.active"),
            t("admin.users.status.disabled")
          ),
      },
      {
        id: "isDefault",
        header: () => t("iam.tenants.members.column.default"),
        cell: ({ row }) =>
          row.original.isDefault ? (
            <Badge variant="secondary">
              {t("iam.tenants.members.default_badge")}
            </Badge>
          ) : (
            <span className="text-muted-foreground">{"—"}</span>
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
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
              disabled={busy}
              onClick={() => onRequestRemove(row.original.userId)}
              title={t("iam.tenants.members.remove_row")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [
      allSelected,
      busy,
      onRequestRemove,
      onToggle,
      onToggleAll,
      selectedIds,
      someSelected,
      t,
    ]
  )
}

type UseTenantUserPickerColumnsParams = {
  selectedUsers: Map<string, User>
  availableUsers: User[]
  onToggle: (user: User, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
}

export function useTenantUserPickerColumns({
  selectedUsers,
  availableUsers,
  onToggle,
  onToggleAll,
}: UseTenantUserPickerColumnsParams) {
  const { t } = useI18n()

  const allPageSelected =
    availableUsers.length > 0 &&
    availableUsers.every((user) => selectedUsers.has(user.id))
  const somePageSelected =
    !allPageSelected &&
    availableUsers.some((user) => selectedUsers.has(user.id))

  return useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              allPageSelected
                ? true
                : somePageSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => onToggleAll(value === true)}
            aria-label={t("common.action.select_all")}
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedUsers.has(row.original.id)}
            onCheckedChange={(value) => onToggle(row.original, value === true)}
            aria-label={t("iam.tenants.members.select_for_add", {
              user: userLabel(row.original),
            })}
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "user",
        header: () => t("iam.tenants.members.column.member"),
        cell: ({ row }) =>
          userNameCell(userLabel(row.original), row.original.username),
      },
      {
        accessorKey: "email",
        header: () => t("common.field.email"),
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {row.original.email || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: () => t("common.field.status"),
        cell: ({ row }) =>
          statusBadge(
            row.original.status,
            t("admin.users.status.active"),
            t("admin.users.status.disabled")
          ),
      },
    ],
    [allPageSelected, onToggle, onToggleAll, selectedUsers, somePageSelected, t]
  )
}
