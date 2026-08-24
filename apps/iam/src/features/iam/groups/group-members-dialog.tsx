import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { Group, User } from "@/features/iam"
import { adminApi } from "@/features/iam"
import { ApiClientError } from "@workspace/api/client"
import { ensureRecentAuth } from "@workspace/auth/ensure-recent-auth"
import { translateApiError, useI18n } from "@workspace/i18n"
import { listPageCount } from "@workspace/api/list"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { ArrowLeft, Trash2 } from "lucide-react"
import { GroupMembersTableView } from "./components/GroupMembersTableView"
import { AddGroupMembersView } from "./components/AddGroupMembersView"

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
  const [membersLoading, setMembersLoading] = useState(false)
  const [pickerData, setPickerData] = useState<{
    items: User[]
    total: number
    per_page: number
  } | null>(null)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const membersLoadedForRef = useRef<string | null>(null)

  const groupId = group?.id

  const debouncedMemberSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim().toLowerCase())
    setMembersPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 300)

  const debouncedAddSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim())
    setAddPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 300)

  useEffect(() => {
    if (!open || !groupId || membersLoadedForRef.current === groupId) {
      if (open && !groupId) {
        setDraftMembers([])
      }
      return
    }
    let cancelled = false
    setMembersLoading(true)
    void adminApi
      .listGroupMembers(groupId)
      .then((res) => {
        if (!cancelled) {
          setDraftMembers(res.items)
          setSelectedRemoveIds(new Set())
        }
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
        if (!cancelled) membersLoadedForRef.current = groupId
      })
    return () => {
      cancelled = true
    }
  }, [open, groupId])

  useEffect(() => {
    if (!open || view !== "add") return
    let cancelled = false
    setPickerLoading(true)
    const q = search || undefined
    void adminApi
      .listUsers({
        page: addPagination.pageIndex + 1,
        perPage: addPagination.pageSize,
        q,
      })
      .then((res) => {
        if (!cancelled) setPickerData(res)
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, view, addPagination.pageIndex, addPagination.pageSize, search])

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
      setPickerData(null)
      membersLoadedForRef.current = null
    }
  }, [open])

  const originalMemberIds = useMemo(
    () => new Set(draftMembers.map((user) => user.id)),
    [draftMembers]
  )

  const draftMemberIds = useMemo(
    () => new Set(draftMembers.map((user) => user.id)),
    [draftMembers]
  )

  const isDirty = useMemo(
    () => !sameMemberSet(originalMemberIds, draftMemberIds),
    [draftMemberIds, originalMemberIds]
  )

  const filteredMembers = useMemo(
    () => draftMembers.filter((user) => userMatchesSearch(user, search)),
    [draftMembers, search]
  )

  const availableUsers = useMemo(
    () =>
      (pickerData?.items ?? []).filter((user) => !draftMemberIds.has(user.id)),
    [draftMemberIds, pickerData?.items]
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
    const originalIds = originalMemberIds
    const currentDraftIds = draftMemberIds
    const toAdd = [...currentDraftIds].filter((id) => !originalIds.has(id))
    const toRemove = [...originalIds].filter((id) => !currentDraftIds.has(id))
    if (toAdd.length === 0 && toRemove.length === 0) return
    const verified = await ensureRecentAuth().catch(() => false)
    if (!verified) {
      throw new ApiClientError(
        "recent_auth_required",
        "recent_auth_required",
        403
      )
    }
    setSaving(true)
    try {
      for (const userId of toRemove) {
        await adminApi.removeGroupMember(groupId, userId)
      }
      for (const userId of toAdd) {
        await adminApi.addGroupMember(groupId, userId)
      }
      notify.success(t("admin.groups.members.save_success"))
      onOpenChange(false)
    } catch (err) {
      notify.error(
        t("admin.groups.members.save_failed"),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
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
            <div className="truncate font-medium">
              {displayName(row.original)}
            </div>
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
            <div className="truncate font-medium">
              {displayName(row.original)}
            </div>
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
    pickerData?.total ?? 0,
    pickerData?.per_page ?? addPagination.pageSize
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
            <GroupMembersTableView
              table={membersTable}
              searchInput={searchInput}
              onSearchChange={(val) => {
                setSearchInput(val)
                debouncedMemberSearch(val)
              }}
              onOpenAdd={openAddView}
              onRemoveSelected={() => removeFromDraft([...selectedRemoveIds])}
              selectedRemoveCount={selectedRemoveIds.size}
              draftMembersCount={draftMembers.length}
              isDirty={isDirty}
              loading={membersLoading}
              filteredMembersCount={filteredMembers.length}
              onRemoveSingle={(id) => removeFromDraft([id])}
              selectedRemoveIds={selectedRemoveIds}
              onToggleRemoveSelection={toggleRemoveSelection}
              onToggleSelectAll={(checked) => {
                if (checked) {
                  setSelectedRemoveIds(new Set(filteredMembers.map((u) => u.id)))
                } else {
                  setSelectedRemoveIds(new Set())
                }
              }}
              isAllSelected={
                filteredMembers.length > 0 &&
                filteredMembers.every((u) => selectedRemoveIds.has(u.id))
              }
              isSomeSelected={
                filteredMembers.some((u) => selectedRemoveIds.has(u.id)) &&
                !filteredMembers.every((u) => selectedRemoveIds.has(u.id))
              }
            />
            <DialogFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button onClick={save} disabled={!isDirty || saving}>
                {saving ? t("common.action.saving") : t("common.action.save")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <AddGroupMembersView
              table={addTable}
              searchInput={searchInput}
              onSearchChange={(val) => {
                setSearchInput(val)
                debouncedAddSearch(val)
              }}
              loading={pickerLoading}
              availableUsersCount={availableUsers.length}
            />
            <DialogFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={backToMembers}>
                {t("common.action.cancel")}
              </Button>
              <Button
                onClick={confirmAdd}
                disabled={selectedAddUsers.size === 0}
              >
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
