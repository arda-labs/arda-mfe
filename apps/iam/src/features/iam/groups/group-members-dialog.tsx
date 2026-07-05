import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { Group, User } from "@/features/iam"
import {
  useApplyGroupMembers,
  useGroupMemberPicker,
  useGroupMembers,
} from "@/features/iam/groups/queries"
import { translateApiError, useI18n } from "@workspace/i18n"
import { listPageCount } from "@workspace/core/http/list-api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react"

const PAGE_SIZE = 10

type DialogView = "members" | "add"

type GroupMembersDialogProps = {
  group: Group | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function displayName(user: User) {
  return user.name || user.username || user.email || "-"
}

function userMatchesSearch(user: User, needle: string) {
  if (!needle) return true
  const haystack = [user.name, user.username, user.email, user.nickname]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

function sameMemberSet(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false
  for (const id of left) {
    if (!right.has(id)) return false
  }
  return true
}

export function GroupMembersDialog({
  group,
  open,
  onOpenChange,
}: GroupMembersDialogProps) {
  const { t, formatDate } = useI18n()
  const [view, setView] = useState<DialogView>("members")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [draftMembers, setDraftMembers] = useState<User[]>([])
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedAddUsers, setSelectedAddUsers] = useState<Map<string, User>>(
    new Map()
  )
  const [membersPagination, setMembersPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })
  const [addPagination, setAddPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const groupId = group?.id
  const membersQuery = useGroupMembers(groupId)
  const pickerQuery = useGroupMemberPicker(view === "add", {
    page: addPagination.pageIndex + 1,
    perPage: addPagination.pageSize,
    q: view === "add" ? search || undefined : undefined,
  })
  const applyMembers = useApplyGroupMembers()

  const debouncedMemberSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim().toLowerCase())
    setMembersPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 300)

  const debouncedAddSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim())
    setAddPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 300)

  const originalMemberIds = useMemo(
    () => new Set((membersQuery.data ?? []).map((user) => user.id)),
    [membersQuery.data]
  )

  const draftMemberIds = useMemo(
    () => new Set(draftMembers.map((user) => user.id)),
    [draftMembers]
  )

  const isDirty = useMemo(
    () => !sameMemberSet(originalMemberIds, draftMemberIds),
    [draftMemberIds, originalMemberIds]
  )

  useEffect(() => {
    if (!open) {
      setView("members")
      setSearchInput("")
      setSearch("")
      setDraftMembers([])
      setSelectedRemoveIds(new Set())
      setSelectedAddUsers(new Map())
      setMembersPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
      setAddPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
      return
    }
    if (membersQuery.data) {
      setDraftMembers(membersQuery.data)
      setSelectedRemoveIds(new Set())
    }
  }, [open, membersQuery.data])

  const filteredMembers = useMemo(
    () => draftMembers.filter((user) => userMatchesSearch(user, search)),
    [draftMembers, search]
  )

  const availableUsers = useMemo(
    () =>
      (pickerQuery.data?.items ?? []).filter((user) => !draftMemberIds.has(user.id)),
    [draftMemberIds, pickerQuery.data?.items]
  )

  const removeFromDraft = useCallback((userIds: string[]) => {
    const removeSet = new Set(userIds)
    setDraftMembers((prev) => prev.filter((user) => !removeSet.has(user.id)))
    setSelectedRemoveIds((prev) => {
      const next = new Set(prev)
      for (const userId of userIds) next.delete(userId)
      return next
    })
  }, [])

  const toggleRemoveSelection = (userId: string, checked: boolean) => {
    setSelectedRemoveIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  const toggleAddSelection = (user: User, checked: boolean) => {
    setSelectedAddUsers((prev) => {
      const next = new Map(prev)
      if (checked) next.set(user.id, user)
      else next.delete(user.id)
      return next
    })
  }

  const openAddView = () => {
    setSearchInput("")
    setSearch("")
    setSelectedAddUsers(new Map())
    setAddPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
    setView("add")
  }

  const backToMembers = () => {
    setView("members")
    setSearchInput("")
    setSearch("")
    setSelectedAddUsers(new Map())
    setAddPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
  }

  const confirmAdd = () => {
    const users = [...selectedAddUsers.values()]
    if (users.length === 0) return
    setDraftMembers((prev) => {
      const existing = new Set(prev.map((user) => user.id))
      const additions = users.filter((user) => !existing.has(user.id))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
    backToMembers()
  }

  const save = async () => {
    if (!groupId || !isDirty) return
    const toAdd = [...draftMemberIds].filter((id) => !originalMemberIds.has(id))
    const toRemove = [...originalMemberIds].filter((id) => !draftMemberIds.has(id))
    try {
      await applyMembers.mutateAsync({ groupId, toAdd, toRemove })
      notify.success(t("admin.groups.members.save_success"))
      onOpenChange(false)
    } catch (err) {
      notify.error(
        t("admin.groups.members.save_failed"),
        translateApiError(err)
      )
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (view === "add") {
      backToMembers()
      return
    }
    if (isDirty && !window.confirm(t("admin.groups.members.discard_confirm"))) {
      return
    }
    onOpenChange(false)
  }

  const memberColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: () => t("admin.groups.members.column.select"),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRemoveIds.has(row.original.id)}
            onCheckedChange={(value) =>
              toggleRemoveSelection(row.original.id, value === true)
            }
            aria-label={t("admin.groups.members.select_for_remove", {
              user: displayName(row.original),
            })}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "name",
        header: () => t("common.field.name"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{displayName(row.original)}</div>
            {row.original.username ? (
              <div className="truncate font-mono text-xs text-muted-foreground">
                {row.original.username}
              </div>
            ) : null}
          </div>
        ),
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
        accessorKey: "status",
        header: () => t("common.field.status"),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "ACTIVE" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "ACTIVE"
                ? t("admin.users.status.active")
                : t("admin.users.status.disabled")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        accessorKey: "createdAt",
        header: () => t("common.field.created"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdAt ? formatDate(row.original.createdAt) : "-"}
          </span>
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
              onClick={() => removeFromDraft([row.original.id])}
              title={t("admin.groups.members.remove_row")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [formatDate, removeFromDraft, selectedRemoveIds, t]
  )

  const addColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: () => t("admin.groups.members.add_dialog.column.select"),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedAddUsers.has(row.original.id)}
            onCheckedChange={(value) =>
              toggleAddSelection(row.original, value === true)
            }
            aria-label={t("admin.groups.members.add_member", {
              user: displayName(row.original),
            })}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "name",
        header: () => t("common.field.name"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{displayName(row.original)}</div>
            {row.original.username ? (
              <div className="truncate font-mono text-xs text-muted-foreground">
                {row.original.username}
              </div>
            ) : null}
          </div>
        ),
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
    ],
    [selectedAddUsers, t]
  )

  const membersPageCount = Math.max(
    1,
    Math.ceil(filteredMembers.length / membersPagination.pageSize)
  )

  const membersTable = useReactTable({
    data: filteredMembers,
    columns: memberColumns,
    pageCount: membersPageCount,
    state: { pagination: membersPagination },
    onPaginationChange: setMembersPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const addPageCount = listPageCount(
    pickerQuery.data?.total ?? 0,
    pickerQuery.data?.per_page ?? addPagination.pageSize
  )

  const addTable = useReactTable({
    data: availableUsers,
    columns: addColumns,
    pageCount: addPageCount,
    state: { pagination: addPagination },
    onPaginationChange: setAddPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  })

  const dialogTitle =
    view === "add"
      ? t("admin.groups.members.add_dialog.title")
      : t("admin.groups.members.title", {
          group: group?.name || group?.code || "",
        })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            {view === "add" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={backToMembers}
                title={t("common.action.back")}
              >
                <ArrowLeft className="size-4" />
              </Button>
            ) : null}
            <DialogTitle className="text-left">{dialogTitle}</DialogTitle>
          </div>
        </DialogHeader>

        {view === "members" ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearchInput(value)
                    debouncedMemberSearch(value)
                  }}
                  placeholder={t("admin.groups.members.search_current")}
                  className="pl-9"
                />
              </div>
              <Button type="button" size="sm" onClick={openAddView}>
                <Plus className="size-4" />
                {t("admin.groups.members.add_button")}
              </Button>
              {selectedRemoveIds.size > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeFromDraft([...selectedRemoveIds])}
                >
                  <Trash2 className="size-4" />
                  {t("admin.groups.members.remove_selected", {
                    count: selectedRemoveIds.size,
                  })}
                </Button>
              ) : null}
              <Badge variant="secondary" className="shrink-0">
                {t("admin.groups.members.assigned_count", {
                  count: draftMembers.length,
                })}
              </Badge>
              {isDirty ? (
                <Badge variant="outline" className="shrink-0">
                  {t("admin.groups.members.unsaved")}
                </Badge>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
              {membersQuery.isLoading ? (
                <div className="py-8 text-sm text-muted-foreground">
                  {t("admin.groups.members.loading")}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  {draftMembers.length === 0
                    ? t("admin.groups.members.empty_assigned")
                    : t("admin.groups.members.empty_search")}
                </div>
              ) : (
                <DataTable
                  table={membersTable}
                  defaultDensity="compact"
                  className="min-h-0"
                />
              )}
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button onClick={save} disabled={!isDirty || applyMembers.isPending}>
                {applyMembers.isPending
                  ? t("common.action.saving")
                  : t("common.action.save")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="border-b px-6 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearchInput(value)
                    debouncedAddSearch(value)
                  }}
                  placeholder={t("admin.groups.members.add_dialog.search")}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
              {pickerQuery.isLoading ? (
                <div className="py-8 text-sm text-muted-foreground">
                  {t("admin.groups.members.loading")}
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  {t("admin.groups.members.add_dialog.empty")}
                </div>
              ) : (
                <DataTable
                  table={addTable}
                  defaultDensity="compact"
                  className="min-h-0"
                  fetching={pickerQuery.isFetching}
                />
              )}
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={backToMembers}>
                {t("common.action.cancel")}
              </Button>
              <Button onClick={confirmAdd} disabled={selectedAddUsers.size === 0}>
                {t("admin.groups.members.add_dialog.confirm", {
                  count: selectedAddUsers.size,
                })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
