import { useEffect, useMemo, useState } from "react"
import type { Group, Role } from "@/features/iam"
import {
  useGroupRolePicker,
  useGroupRoles,
  useSetGroupRole,
} from "@/features/iam/groups/queries"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { Search } from "lucide-react"

type RoleFilter = "all" | "assigned"

type GroupRolesDialogProps = {
  group: Group | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function roleModule(code: string) {
  const dot = code.indexOf(".")
  if (dot <= 0) return "other"
  return code.slice(0, dot)
}

export function GroupRolesDialog({
  group,
  open,
  onOpenChange,
}: GroupRolesDialogProps) {
  const { t } = useI18n()
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<RoleFilter>("all")

  const groupId = group?.id
  const groupRolesQuery = useGroupRoles(groupId)
  const rolePickerQuery = useGroupRolePicker(search || undefined)
  const setGroupRole = useSetGroupRole()
  const busyRoleId = setGroupRole.isPending ? setGroupRole.variables?.roleId : null

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim())
  }, 300)

  useEffect(() => {
    if (!open) {
      setSearchInput("")
      setSearch("")
      setFilter("all")
    }
  }, [open])

  const assignedRoleIDs = useMemo(
    () => new Set((groupRolesQuery.data ?? []).map((role) => role.id)),
    [groupRolesQuery.data]
  )

  const visibleRoles = useMemo(() => {
    const roles = rolePickerQuery.data?.roles ?? []
    if (filter === "assigned") {
      return roles.filter((role) => assignedRoleIDs.has(role.id))
    }
    return roles
  }, [assignedRoleIDs, filter, rolePickerQuery.data?.roles])

  const rolesByModule = useMemo(() => {
    const groups = new Map<string, Role[]>()
    for (const role of visibleRoles) {
      const module = roleModule(role.code)
      groups.set(module, [...(groups.get(module) ?? []), role])
    }
    return Array.from(groups.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  }, [visibleRoles])

  const toggleRole = async (role: Role, assigned: boolean) => {
    if (!groupId) return
    try {
      await setGroupRole.mutateAsync({
        groupId,
        roleId: role.id,
        assigned,
      })
      notify.success(t("admin.groups.roles.update_success"))
    } catch (err) {
      notify.error(
        t("admin.groups.roles.update_failed"),
        translateApiError(err)
      )
    }
  }

  const loading = groupRolesQuery.isLoading || rolePickerQuery.isLoading
  const assignedCount = groupRolesQuery.data?.length ?? 0
  const totalRoles = rolePickerQuery.data?.total ?? visibleRoles.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle>
            {t("admin.groups.roles.title", {
              group: group?.name || group?.code || "",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("admin.groups.roles.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value
                setSearchInput(value)
                debouncedSearch(value)
              }}
              placeholder={t("admin.groups.roles.search")}
              className="pl-9"
            />
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={filter}
            onValueChange={(value) => {
              if (!value) return
              setFilter(value as RoleFilter)
            }}
          >
            <ToggleGroupItem value="all" aria-label={t("admin.groups.roles.filter.all")}>
              {t("admin.groups.roles.filter.all")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="assigned"
              aria-label={t("admin.groups.roles.filter.assigned")}
            >
              {t("admin.groups.roles.filter.assigned")}
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="secondary" className="shrink-0">
            {t("admin.groups.roles.assigned_count", {
              assigned: assignedCount,
              total: totalRoles,
            })}
          </Badge>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 [scrollbar-gutter:stable]">
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">
              {t("admin.groups.roles.loading")}
            </div>
          ) : visibleRoles.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              {filter === "assigned"
                ? t("admin.groups.roles.empty_assigned")
                : t("admin.groups.roles.empty")}
            </div>
          ) : (
            <div className="space-y-5">
              {rolesByModule.map(([module, roles]) => {
                const assignedInModule = roles.filter((role) =>
                  assignedRoleIDs.has(role.id)
                ).length
                return (
                  <section key={module} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {module === "other"
                          ? t("admin.groups.roles.module_other")
                          : module}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {t("admin.groups.roles.module_count", {
                          assigned: assignedInModule,
                          total: roles.length,
                        })}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead>{t("common.field.name")}</TableHead>
                            <TableHead>{t("common.field.code")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roles.map((role) => {
                            const assigned = assignedRoleIDs.has(role.id)
                            return (
                              <TableRow key={role.id}>
                                <TableCell className="w-10">
                                  <Checkbox
                                    checked={assigned}
                                    disabled={busyRoleId === role.id}
                                    onCheckedChange={() =>
                                      toggleRole(role, assigned)
                                    }
                                    aria-label={
                                      assigned
                                        ? t("admin.groups.roles.remove_role", {
                                            role: role.name,
                                          })
                                        : t("admin.groups.roles.add_role", {
                                            role: role.name,
                                          })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {role.name}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {role.code}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
