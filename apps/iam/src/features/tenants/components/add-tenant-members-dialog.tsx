import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PaginationState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { notify } from "@workspace/ui/feedback/notify"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { Search } from "lucide-react"
import { listAllUsers } from "../../users/api"
import type { User } from "../../users/types"
import { tenantsApi } from "../api"
import { useTenantUserPickerColumns } from "./tenant-members-columns"

const PAGE_SIZE = 10

type AddTenantMembersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  tenantName: string
  /** Users already in the tenant — hidden from the pickable list. */
  excludeUserIds: Set<string>
  /** Refresh the tenant member table after members were added. */
  onAdded: () => Promise<void>
}

function userMatchesSearch(user: User, needle: string) {
  if (!needle) return true
  const haystack = [user.name, user.username, user.email, user.nickname]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

/**
 * Client-side picker for users that are not members of the tenant yet. The
 * complete directory is loaded once when the dialog opens, then filtered,
 * searched and paged in memory.
 */
export function AddTenantMembersDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  excludeUserIds,
  onAdded,
}: AddTenantMembersDialogProps) {
  const { t } = useI18n()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Map<string, User>>(new Map())
  const [adding, setAdding] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const directory = await listAllUsers()
      if (requestRef.current !== requestId) return
      setUsers(directory)
    } catch (err) {
      if (requestRef.current !== requestId) return
      setUsers([])
      setError(translateApiError(err))
    } finally {
      if (requestRef.current === requestId) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      requestRef.current += 1
      setUsers([])
      setLoading(false)
      setError(null)
      setSearchInput("")
      setSearch("")
      setSelected(new Map())
      setAdding(false)
      setPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
      return
    }
    void load()
  }, [open, load])

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim().toLowerCase())
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, 250)

  const candidates = useMemo(
    () =>
      users.filter(
        (user) =>
          !excludeUserIds.has(user.id) && userMatchesSearch(user, search)
      ),
    [excludeUserIds, search, users]
  )

  const toggleSelection = useCallback((user: User, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (checked) next.set(user.id, user)
      else next.delete(user.id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Map(prev)
        for (const user of candidates) {
          if (checked) next.set(user.id, user)
          else next.delete(user.id)
        }
        return next
      })
    },
    [candidates]
  )

  const columns = useTenantUserPickerColumns({
    selectedUsers: selected,
    availableUsers: candidates,
    onToggle: toggleSelection,
    onToggleAll: toggleAll,
  })

  const table = useReactTable({
    data: candidates,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleAdd = async () => {
    const chosen = [...selected.values()]
    if (!tenantId || chosen.length === 0) return
    setAdding(true)
    let added = 0
    let failed = 0
    for (const user of chosen) {
      try {
        await tenantsApi.addTenantMember(tenantId, user.id)
        added += 1
      } catch {
        failed += 1
      }
    }
    setAdding(false)
    setSelected(new Map())
    if (added > 0) {
      notify.success(t("iam.tenants.members.add_success", { count: added }))
      await onAdded()
    }
    if (failed > 0) {
      notify.error(
        t("iam.tenants.members.add_failed"),
        t("iam.tenants.members.add_partial_failed", { count: failed })
      )
      await load()
      return
    }
    if (added > 0) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-left">
            {t("iam.tenants.members.add_title", { tenant: tenantName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 border-b px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                debouncedSearch(event.target.value)
              }}
              placeholder={t("iam.tenants.members.add_search")}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("iam.tenants.members.add_hint")}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">
              {t("iam.tenants.members.add_loading")}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-2 py-8">
              <p className="text-sm font-medium text-destructive">
                {t("iam.tenants.members.users_load_failed")}
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void load()}
              >
                {t("common.action.retry")}
              </Button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              {search
                ? t("iam.tenants.members.add_empty_search")
                : t("iam.tenants.members.add_empty")}
            </div>
          ) : (
            <DataTable
              table={table}
              totalRows={candidates.length}
              defaultDensity="compact"
              className="min-h-0"
            />
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            {t("common.action.cancel")}
          </Button>
          <Button
            onClick={() => void handleAdd()}
            disabled={adding || selected.size === 0}
          >
            {t("iam.tenants.members.add_confirm", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
