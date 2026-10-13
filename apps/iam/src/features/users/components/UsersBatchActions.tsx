import type { Table } from "@tanstack/react-table"
import { useState } from "react"
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
  const [exporting, setExporting] = useState(false)
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs font-semibold border-success/30 text-success hover:text-success hover:bg-success/10"
        disabled={exporting}
        onClick={async () => {
          setExporting(true)
          try {
          const filename = generateExportFilename("users", {
            scope: "selected",
            selectedCount,
          })
          await exportTableToXlsx({
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
          } catch (error) {
            notify.error(t("common.export.failed"), String(error))
          } finally {
            setExporting(false)
          }
        }}
      >
        <FileSpreadsheet className="mr-1.5 size-3.5 text-success" />
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
