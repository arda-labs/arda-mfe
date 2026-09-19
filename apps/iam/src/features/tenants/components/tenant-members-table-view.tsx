import type { Table as TanstackTable } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import type { TenantMember } from "../types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Input } from "@workspace/ui/components/input"
import { Plus, Search, Trash2 } from "lucide-react"

type TenantMembersTableViewProps = {
  table: TanstackTable<TenantMember>
  loading: boolean
  error: string | null
  onRetry: () => void
  searchInput: string
  onSearchChange: (value: string) => void
  onOpenAdd: () => void
  onRemoveSelected: () => void
  selectedRemoveCount: number
  memberCount: number
  filteredCount: number
  busy: boolean
}

export function TenantMembersTableView({
  table,
  loading,
  error,
  onRetry,
  searchInput,
  onSearchChange,
  onOpenAdd,
  onRemoveSelected,
  selectedRemoveCount,
  memberCount,
  filteredCount,
  busy,
}: TenantMembersTableViewProps) {
  const { t } = useI18n()

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("iam.tenants.members.search_members")}
            className="pl-9"
          />
        </div>
        <Button type="button" size="sm" onClick={onOpenAdd} disabled={busy}>
          <Plus className="size-4" />
          {t("iam.tenants.members.add_button")}
        </Button>
        {selectedRemoveCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={onRemoveSelected}
          >
            <Trash2 className="size-4" />
            {t("iam.tenants.members.remove_selected", {
              count: selectedRemoveCount,
            })}
          </Button>
        ) : null}
        <Badge variant="secondary" className="shrink-0">
          {t("iam.tenants.members.count", { count: memberCount })}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">
            {t("iam.tenants.members.loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 py-8">
            <p className="text-sm font-medium text-destructive">
              {t("iam.tenants.members.load_failed")}
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              {t("common.action.retry")}
            </Button>
          </div>
        ) : filteredCount === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            {memberCount === 0
              ? t("iam.tenants.members.empty")
              : t("iam.tenants.members.empty_search")}
          </div>
        ) : (
          <DataTable
            table={table}
            totalRows={filteredCount}
            defaultDensity="compact"
            className="min-h-0"
          />
        )}
      </div>
    </>
  )
}
