import type { Table as TanstackTable } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import type { User } from "../../users/types"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { Input } from "@workspace/ui/components/input"
import { Search } from "lucide-react"

export function AddGroupMembersView({
  table,
  searchInput,
  onSearchChange,
  loading,
  availableUsersCount,
}: {
  table: TanstackTable<User>
  searchInput: string
  onSearchChange: (value: string) => void
  loading: boolean
  availableUsersCount: number
}) {
  const { t } = useI18n()

  return (
    <>
      <div className="border-b px-6 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("admin.groups.members.add_dialog.search")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-6 py-3">
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">
            {t("admin.groups.members.loading")}
          </div>
        ) : availableUsersCount === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            {t("admin.groups.members.add_dialog.empty")}
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
