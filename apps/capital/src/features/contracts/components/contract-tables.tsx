import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import type { CapitalMovement, ContractAmendment } from "../../api"

/** "Lịch sử giao dịch" tab: receipts, disbursements, payments, settlement. */
export function MovementsTable({ rows }: { rows: CapitalMovement[] }) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("capital.movements.field.type")}</TableHead>
            <TableHead>{t("capital.movements.field.date")}</TableHead>
            <TableHead className="text-right">{t("capital.movements.field.amount")}</TableHead>
            <TableHead>{t("capital.movements.field.note")}</TableHead>
            <TableHead>{t("common.field.status")}</TableHead>
            <TableHead>{t("capital.field.journal")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                {t("capital.movements.empty")}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{t(`capital.movement_type.${row.movement_type}`)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateShort(row.movement_date)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
              <TableCell>
                <StatusBadge status={row.status}>
                  {t(`capital.movement_status.${row.status}`)}
                </StatusBadge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.journal_entry_id ? row.journal_entry_id.slice(0, 8) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** "Điều chỉnh" tab: submitted amendments and their approval status. */
export function AmendmentsTable({ rows }: { rows: ContractAmendment[] }) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("capital.amendments.field.reason")}</TableHead>
            <TableHead>{t("capital.amendments.field.payload")}</TableHead>
            <TableHead>{t("common.field.created")}</TableHead>
            <TableHead>{t("common.field.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                {t("capital.amendments.empty")}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.reason || "—"}</TableCell>
              <TableCell className="max-w-[360px] truncate font-mono text-xs text-muted-foreground">
                {JSON.stringify(row.payload)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDateShort(row.created_at)}</TableCell>
              <TableCell>
                <StatusBadge status={row.status}>
                  {t(`capital.amendment_status.${row.status}`)}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
