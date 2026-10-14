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
import type { IbmMovement } from "../../api"

/** Movements of an interbank placement (top-up, interest, expected, withdraw). */
export function IbmMovementsTable({ movements }: { movements: IbmMovement[] }) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("deposit.interbank.movement.field.kind")}</TableHead>
            <TableHead>{t("deposit.interbank.movement.field.date")}</TableHead>
            <TableHead className="text-right">{t("deposit.interbank.movement.field.amount")}</TableHead>
            <TableHead>{t("deposit.interbank.movement.field.note")}</TableHead>
            <TableHead>{t("common.field.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                {t("deposit.interbank.movement.empty")}
              </TableCell>
            </TableRow>
          )}
          {movements.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{t(`deposit.interbank.movement_kind.${row.kind}`)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateShort(row.movement_date)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
              <TableCell>
                <StatusBadge status={row.status}>
                  {t(`deposit.interbank.movement_status.${row.status}`)}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
