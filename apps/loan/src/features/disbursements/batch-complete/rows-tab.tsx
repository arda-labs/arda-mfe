import { useMemo } from "react"
import { useI18n } from "@workspace/i18n"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { formatAmount, fromMinor } from "@workspace/format"
import type { LoanDisbursementBatchRow } from "../../api"
import { PostingRulesPreview } from "../../loan-batches/components/posting-rules-preview"
import { BatchGridHead, PlanGroupedTable } from "../../loan-batches/components/plan-grouped-table"
import { inputToMinor } from "../../loan-batches/row-math"

export interface CompleteRow extends LoanDisbursementBatchRow {
  key: string
  /** Số tiền hoàn tất (major-unit input) — default = số tiền phiếu gốc. */
  amount: string
  isClosed: boolean
  /** plan_code enrichment qua GET /agreements?contract_code (BE rows không carry plan). */
  planCode: string
}

/** amount_minor = 0 khi is_closed (đóng hợp đồng, không rút tiếp). */
export function completeAmountMinor(row: CompleteRow): number {
  if (row.isClosed) return 0
  return inputToMinor(row.amount)
}

/**
 * Tab 2 of the complete batch: các dòng của phiếu gốc group theo plan
 * (readonly nhóm) với cột sửa được Số tiền hoàn tất (≤ phiếu gốc) + Đóng HĐ
 * (amount = 0, disable input); bút toán dự kiến LNM_DISB_COMPLETE ở cuối.
 * Presentational — row state lives in page.tsx.
 */
export function CompleteRowsTab({
  rows,
  detailPending,
  onChangeRow,
}: {
  rows: CompleteRow[]
  detailPending: boolean
  onChangeRow: (key: string, patch: Partial<CompleteRow>) => void
}) {
  const { t } = useI18n()

  const groups = useMemo(() => {
    const byPlan = new Map<string, CompleteRow[]>()
    for (const row of rows) {
      const bucket = byPlan.get(row.planCode) ?? []
      bucket.push(row)
      byPlan.set(row.planCode, bucket)
    }
    return [...byPlan.entries()].map(([planCode, groupRows]) => ({
      planCode,
      totalMinor: groupRows.reduce((sum, row) => sum + completeAmountMinor(row), 0),
      currency: "VND",
      rows: groupRows.map((row) => (
        <TableRow key={row.key} className={row.isClosed ? "opacity-60" : undefined}>
          <TableCell className="font-mono text-xs">{row.contract_code}</TableCell>
          <TableCell className="font-mono text-xs text-primary">{row.agreement_code}</TableCell>
          <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">
            {formatAmount(fromMinor(row.amount_minor), "VND")}
          </TableCell>
          <TableCell>
            <Input
              className="h-8 w-36 text-right tabular-nums"
              inputMode="decimal"
              value={row.isClosed ? "0" : row.amount}
              disabled={row.isClosed || detailPending}
              placeholder="0"
              onChange={(e) => onChangeRow(row.key, { amount: e.target.value })}
            />
          </TableCell>
          <TableCell className="text-center">
            <Checkbox
              checked={row.isClosed}
              onCheckedChange={(checked) =>
                onChangeRow(row.key, { isClosed: checked === true, amount: "0" })
              }
              aria-label={t("loan.disbursements.batch.col_is_closed")}
            />
          </TableCell>
        </TableRow>
      )),
    }))
  }, [rows, detailPending, onChangeRow, t])

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("loan.disbursements.batch.rows_hint")}</p>
      <PlanGroupedTable
        groups={groups}
        headerCells={<CompleteHeaderCells />}
        emptyLabel={
          detailPending ? t("loan.loading") : t("loan.disbursements.batch.no_source_hint")
        }
      />
      <PostingRulesPreview documentType="LNM_DISB_COMPLETE" />
    </div>
  )
}

function CompleteHeaderCells() {
  const { t } = useI18n()
  return (
    <>
      <BatchGridHead label={t("loan.field.contract_code")} />
      <BatchGridHead label={t("loan.field.agreement_code")} />
      <BatchGridHead
        label={t("loan.disbursements.batch.col_initial_amount")}
        className="text-right"
      />
      <BatchGridHead label={t("loan.disbursements.batch.col_complete_amount")} />
      <BatchGridHead
        label={t("loan.disbursements.batch.col_is_closed")}
        className="w-16 text-center"
      />
    </>
  )
}
