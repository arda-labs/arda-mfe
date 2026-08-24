import type { Table as TanstackTable } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import type { User } from "@/features/iam"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Input } from "@workspace/ui/components/input"
import { Plus, Search, Trash2 } from "lucide-react"

export function GroupMembersTableView({
  table,
  searchInput,
  onSearchChange,
  onOpenAdd,
  onRemoveSelected,
  selectedRemoveCount,
  draftMembersCount,
  isDirty,
  loading,
  filteredMembersCount,
}: {
  table: TanstackTable<User>
  searchInput: string
  onSearchChange: (value: string) => void
  onOpenAdd: () => void
  onRemoveSelected: () => void
  selectedRemoveCount: number
  draftMembersCount: number
  isDirty: boolean
  loading: boolean
  filteredMembersCount: number
  onRemoveSingle?: (id: string) => void
  selectedRemoveIds?: Set<string>
  onToggleRemoveSelection?: (id: string, checked: boolean) => void
  onToggleSelectAll?: (checked: boolean) => void
  isAllSelected?: boolean
  isSomeSelected?: boolean
}) {
  const { t } = useI18n()

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("admin.groups.members.search_current")}
            className="pl-9"
          />
        </div>
        <Button type="button" size="sm" onClick={onOpenAdd}>
          <Plus className="size-4" />
          {t("admin.groups.members.add_button")}
        </Button>
        {selectedRemoveCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onRemoveSelected}
          >
            <Trash2 className="size-4" />
            {t("admin.groups.members.remove_selected", {
              count: selectedRemoveCount,
            })}
          </Button>
        ) : null}
        <Badge variant="secondary" className="shrink-0">
          {t("admin.groups.members.assigned_count", {
            count: draftMembersCount,
          })}
        </Badge>
        {isDirty ? (
          <Badge variant="outline" className="shrink-0">
            {t("admin.groups.members.unsaved")}
          </Badge>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">
            {t("admin.groups.members.loading")}
          </div>
        ) : filteredMembersCount === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            {draftMembersCount === 0
              ? t("admin.groups.members.empty_assigned")
              : t("admin.groups.members.empty_search")}
          </div>
        ) : (
          <DataTable
            table={table}
            defaultDensity="compact"
            className="min-h-0"
          />
        )}
      </div>
    </>
  )
}
