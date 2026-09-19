import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PaginationState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { notify } from "@workspace/ui/feedback/notify"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { tenantsApi } from "../api"
import type { Tenant, TenantMember } from "../types"
import { AddTenantMembersDialog } from "./add-tenant-members-dialog"
import { useTenantMemberColumns } from "./tenant-members-columns"
import { TenantMemberRemoveDialog } from "./tenant-member-remove-dialog"
import { TenantMembersTableView } from "./tenant-members-table-view"

const PAGE_SIZE = 10

type TenantMembersDialogProps = {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after membership changes so the page can refresh its server list. */
  onChanged?: () => void | Promise<void>
}

function matchesMemberSearch(member: TenantMember, needle: string) {
  if (!needle) return true
  const haystack = [
    member.displayName,
    member.username,
    member.email,
    member.userId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

/**
 * Tenant member management: the dialog lists the tenant's current users in a
 * client-side table (multi-select bulk removal) and opens a separate picker
 * dialog for the users that are not members yet.
 */
export function TenantMembersDialog({
  tenant,
  open,
  onOpenChange,
  onChanged,
}: TenantMembersDialogProps) {
  const { t } = useI18n()
  const tenantId = tenant?.id
  const tenantName = tenant?.name || tenant?.code || ""

  const [addOpen, setAddOpen] = useState(false)
  const [acting, setActing] = useState(false)
  const [members, setMembers] = useState<TenantMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [membersSearchInput, setMembersSearchInput] = useState("")
  const [membersSearch, setMembersSearch] = useState("")
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<Set<string>>(
    new Set()
  )
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })
  const requestRef = useRef(0)

  const loadMembers = useCallback(async () => {
    if (!tenantId) return
    const requestId = ++requestRef.current
    setMembersLoading(true)
    setMembersError(null)
    try {
      const nextMembers = await tenantsApi.listTenantMembers(tenantId)
      if (requestRef.current !== requestId) return
      setMembers(Array.isArray(nextMembers) ? nextMembers : [])
      setSelectedRemoveIds(new Set())
    } catch (err) {
      if (requestRef.current !== requestId) return
      setMembers([])
      setMembersError(translateApiError(err))
    } finally {
      if (requestRef.current === requestId) setMembersLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (!open) {
      requestRef.current += 1
      setAddOpen(false)
      setActing(false)
      setMembers([])
      setMembersLoading(false)
      setMembersError(null)
      setMembersSearchInput("")
      setMembersSearch("")
      setSelectedRemoveIds(new Set())
      setPendingRemoveIds([])
      setPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
      return
    }
    void loadMembers()
  }, [open, loadMembers])

  const debouncedMembersSearch = useDebouncedCallback((value: string) => {
    setMembersSearch(value.trim().toLowerCase())
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 250)

  const memberUserIdSet = useMemo(
    () => new Set(members.map((member) => member.userId)),
    [members]
  )

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => matchesMemberSearch(member, membersSearch)),
    [members, membersSearch]
  )

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedRemoveIds.has(member.userId))
  const someFilteredSelected =
    !allFilteredSelected &&
    filteredMembers.some((member) => selectedRemoveIds.has(member.userId))

  const toggleRemoveSelection = useCallback(
    (userId: string, checked: boolean) => {
      setSelectedRemoveIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(userId)
        else next.delete(userId)
        return next
      })
    },
    []
  )

  const toggleAllFiltered = useCallback(
    (checked: boolean) => {
      setSelectedRemoveIds(
        checked
          ? new Set(filteredMembers.map((member) => member.userId))
          : new Set()
      )
    },
    [filteredMembers]
  )

  const requestRemove = useCallback((userId: string) => {
    setPendingRemoveIds([userId])
  }, [])

  const columns = useTenantMemberColumns({
    selectedIds: selectedRemoveIds,
    allSelected: allFilteredSelected,
    someSelected: someFilteredSelected,
    busy: acting,
    onToggle: toggleRemoveSelection,
    onToggleAll: toggleAllFiltered,
    onRequestRemove: requestRemove,
  })

  const table = useReactTable({
    data: filteredMembers,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleRemove = async (userIds: string[]) => {
    if (!tenantId || userIds.length === 0) return
    setActing(true)
    let removed = 0
    let failed = 0
    for (const userId of userIds) {
      try {
        await tenantsApi.removeTenantMember(tenantId, userId)
        removed += 1
      } catch {
        failed += 1
      }
    }
    setActing(false)
    setPendingRemoveIds([])
    setSelectedRemoveIds(new Set())
    if (removed > 0) {
      notify.success(
        t("iam.tenants.members.remove_success", { count: removed })
      )
      await loadMembers()
      await onChanged?.()
    }
    if (failed > 0) {
      notify.error(
        t("iam.tenants.members.remove_failed"),
        t("iam.tenants.members.remove_partial_failed", { count: failed })
      )
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-left">
              {t("iam.tenants.members.title", { tenant: tenantName })}
            </DialogTitle>
          </DialogHeader>

          <TenantMembersTableView
            table={table}
            loading={membersLoading}
            error={membersError}
            onRetry={() => void loadMembers()}
            searchInput={membersSearchInput}
            onSearchChange={(value) => {
              setMembersSearchInput(value)
              debouncedMembersSearch(value)
            }}
            onOpenAdd={() => setAddOpen(true)}
            onRemoveSelected={() => setPendingRemoveIds([...selectedRemoveIds])}
            selectedRemoveCount={selectedRemoveIds.size}
            memberCount={members.length}
            filteredCount={filteredMembers.length}
            busy={acting}
          />
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.action.close")}
            </Button>
          </DialogFooter>
        </DialogContent>

        <TenantMemberRemoveDialog
          count={pendingRemoveIds.length}
          tenantName={tenantName}
          onCancel={() => setPendingRemoveIds([])}
          onConfirm={() => void handleRemove(pendingRemoveIds)}
        />
      </Dialog>

      <AddTenantMembersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tenantId={tenantId ?? ""}
        tenantName={tenantName}
        excludeUserIds={memberUserIdSet}
        onAdded={async () => {
          await loadMembers()
          await onChanged?.()
        }}
      />
    </>
  )
}
