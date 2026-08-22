import { useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react"
import type { Group, Role } from "@/features/iam"
import { adminApi } from "@/features/iam"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null)

  const groupId = group?.id

  // assigned roles for this group (loaded when open + groupId)
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([])
  const [assignedLoading, setAssignedLoading] = useState(false)
  const assignedLoadedForRef = useRef<string | null>(null)

  // role picker list (search-driven)
  const [pickerRoles, setPickerRoles] = useState<Role[]>([])
  const [pickerTotal, setPickerTotal] = useState(0)
  const [pickerLoading, setPickerLoading] = useState(false)
  const pickerHasLoadedRef = useRef(false)

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim())
  }, 300)

  useEffect(() => {
    if (!open) {
      setSearchInput("")
      setSearch("")
      setFilter("all")
      setAssignedRoles([])
      setPickerRoles([])
      setPickerTotal(0)
      assignedLoadedForRef.current = null
      pickerHasLoadedRef.current = false
    }
  }, [open])

  // Load assigned roles whenever the dialog opens / group changes
  useEffect(() => {
    if (!open || !groupId || assignedLoadedForRef.current === groupId) return
    let cancelled = false
    setAssignedLoading(true)
    void adminApi.listGroupRoles(groupId)
      .then((res) => {
        if (!cancelled) setAssignedRoles(res.roles)
      })
      .catch((err) => {
        if (!cancelled) notify.error(t("admin.groups.roles.update_failed"), translateApiError(err))
      })
      .finally(() => {
        if (!cancelled) setAssignedLoading(false)
        if (!cancelled) assignedLoadedForRef.current = groupId
      })
    return () => {
      cancelled = true
    }
  }, [open, groupId, t])

  // Load role picker list (search-driven)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPickerLoading(true)
    void adminApi.listRoles({ page: 1, perPage: 500, q: search || undefined })
      .then((res) => {
        if (cancelled) return
        setPickerRoles(res.items)
        setPickerTotal(res.total)
      })
      .catch((err) => {
        if (cancelled) return
        notify.error(t("admin.groups.roles.update_failed"), translateApiError(err))
      })
      .finally(() => {
        if (cancelled) return
        pickerHasLoadedRef.current = true
        setPickerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, search, t])

  const assignedRoleIDs = useMemo(
    () => new Set(assignedRoles.map((role) => role.id)),
    [assignedRoles]
  )
  const [optimisticAssigned, applyOptimisticAssigned] = useOptimistic(
    assignedRoleIDs,
    (current, update: { roleId: string; assigned: boolean }) => {
      const next = new Set(current)
      if (update.assigned) next.add(update.roleId)
      else next.delete(update.roleId)
      return next
    }
  )
  const [, startRoleTransition] = useTransition()

  const visibleRoles = useMemo(() => {
    if (filter === "assigned") {
      return pickerRoles.filter((role) => optimisticAssigned.has(role.id))
    }
    return pickerRoles
  }, [optimisticAssigned, filter, pickerRoles])

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

  const toggleRole = useCallback((role: Role, assigned: boolean) => {
    if (!groupId) return
    setBusyRoleId(role.id)
    startRoleTransition(async () => {
      applyOptimisticAssigned({ roleId: role.id, assigned: !assigned })
      try {
        if (assigned) {
          await adminApi.unassignGroupRole(groupId, role.id)
          setAssignedRoles((prev) => prev.filter((r) => r.id !== role.id))
        } else {
          await adminApi.assignGroupRole(groupId, role.id)
          setAssignedRoles((prev) => [...prev, role])
        }
        notify.success(t("admin.groups.roles.update_success"))
      } catch (err) {
        notify.error(
          t("admin.groups.roles.update_failed"),
          translateApiError(err)
        )
      } finally {
        setBusyRoleId(null)
      }
    })
  }, [groupId, applyOptimisticAssigned, t])

  const loading = assignedLoading || pickerLoading
  const assignedCount = assignedRoles.length
  const totalRoles = pickerTotal || visibleRoles.length

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
                  optimisticAssigned.has(role.id)
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
                            const assigned = optimisticAssigned.has(role.id)
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
