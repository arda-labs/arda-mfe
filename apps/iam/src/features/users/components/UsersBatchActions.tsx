import type { Table } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  exportTableToXlsx,
  generateExportFilename,
} from "@workspace/list-page/table-export"
import type { User } from "../types"
import { Trash2, FileSpreadsheet } from "lucide-react"

/**
 * Floating batch actions for selected rows. Row selection requires a select
 * column; without one these buttons stay unreachable, exactly as before the
 * server-list migration.
 */
export function UsersBatchActions({ table }: { table: Table<User> }) {
  const { t } = useI18n()
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs font-semibold border-emerald-600/30 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        onClick={() => {
          const filename = generateExportFilename("users", {
            scope: "selected",
            selectedCount,
          })
          exportTableToXlsx({
            table,
            scope: "selected",
            filename,
            sheetName: "Users",
          })
          notify.success(
            t("iam.users.batch.export_selected_success", {
              count: selectedCount,
            })
          )
        }}
      >
        <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
        {t("iam.users.batch.export_selected", { count: selectedCount })}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 px-2.5 text-xs font-medium"
        onClick={() => {
          notify.info(t("iam.users.batch.delete_selected_armed", { count: selectedCount }))
        }}
      >
        <Trash2 className="mr-1.5 size-3.5" />
        {t("iam.users.batch.delete_selected")}
      </Button>
    </>
  )
}
