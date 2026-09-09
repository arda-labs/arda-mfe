import { useMemo } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { Plus } from "lucide-react"
import { formatAmount, fromMinor } from "@workspace/format"
import type { LoanAgreement, LoanContract } from "../../api"
import { ChooseContractDialog } from "../../loan-batches/components/choose-contract-dialog"
import { PostingRulesPreview } from "../../loan-batches/components/posting-rules-preview"
import {
  BatchGridHead,
  BatchGridRemoveRowButton,
  PlanGroupedTable,
} from "../../loan-batches/components/plan-grouped-table"
import { inputToMinor } from "../../loan-batches/row-math"

/** One editable collection row of the grouped grid (state owned by page.tsx). */
export interface CollectionRow {
  key: string
  contract: LoanContract
  agreement: LoanAgreement
  principal: string
  interest: string
  overdueInterest: string
}

function rowTotalMinor(row: CollectionRow): number {
  return (
    inputToMinor(row.principal) +
    inputToMinor(row.interest) +
    inputToMinor(row.overdueInterest)
  )
}

/**
 * Tab 2 "Danh sách hợp đồng tín dụng" of the collection batch: grid gom nhóm
 * theo plan_code với 3 cột tiền mỗi dòng (gốc ≤ dư nợ — hint dư nợ gốc dưới
 * input / lãi trong hạn / lãi quá hạn), tổng nhóm = Σ(principal + interest +
 * overdue); bút toán dự kiến LNM_COLLECTION render theo items BE trả về.
 * Presentational — row state lives in page.tsx.
 */
export function CollectionContractsTab({
  rows,
  pickerOpen,
  onPickerOpenChange,
  onAddRows,
  onChangeRow,
  onRemoveRow,
  onRemoveGroup,
}: {
  rows: CollectionRow[]
  pickerOpen: boolean
  onPickerOpenChange: (open: boolean) => void
  onAddRows: (picked: (LoanAgreement & { contract: LoanContract })[]) => void
  onChangeRow: (key: string, patch: Partial<CollectionRow>) => void
  onRemoveRow: (key: string) => void
  onRemoveGroup: (planCode: string) => void
}) {
  const { t } = useI18n()

  const groups = useMemo(() => {
    const byPlan = new Map<string, CollectionRow[]>()
    for (const row of rows) {
      const planCode = row.agreement.plan_code ?? ""
      const bucket = byPlan.get(planCode) ?? []
      bucket.push(row)
      byPlan.set(planCode, bucket)
    }
    return [...byPlan.entries()].map(([planCode, groupRows]) => ({
      planCode,
      totalMinor: groupRows.reduce((sum, row) => sum + rowTotalMinor(row), 0),
      currency: groupRows[0]?.agreement.currency_code ?? "VND",
      onRemove: () => onRemoveGroup(planCode),
      rows: groupRows.map((row) => (
        <TableRow key={row.key}>
          <TableCell className="font-mono text-xs">
            {row.contract.contract_no || row.contract.contract_code}
          </TableCell>
          <TableCell className="font-mono text-xs text-primary">
            {row.agreement.agreement_code}
          </TableCell>
          <TableCell>
            <Input
              className="h-8 w-32 text-right tabular-nums"
              inputMode="decimal"
              value={row.principal}
              placeholder="0"
              onChange={(e) => onChangeRow(row.key, { principal: e.target.value })}
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t("loan.collections.batch.outstanding_hint", {
                amount: formatAmount(
                  fromMinor(row.agreement.outstanding_amt_minor),
                  row.agreement.currency_code
                ),
              })}
            </p>
          </TableCell>
          <TableCell>
            <Input
              className="h-8 w-32 text-right tabular-nums"
              inputMode="decimal"
              value={row.interest}
              placeholder="0"
              onChange={(e) => onChangeRow(row.key, { interest: e.target.value })}
            />
          </TableCell>
          <TableCell>
            <Input
              className="h-8 w-32 text-right tabular-nums"
              inputMode="decimal"
              value={row.overdueInterest}
              placeholder="0"
              onChange={(e) => onChangeRow(row.key, { overdueInterest: e.target.value })}
            />
          </TableCell>
          <TableCell className="w-10 text-right">
            <BatchGridRemoveRowButton
              label={t("loan.batch_grid.remove_row")}
              onClick={() => onRemoveRow(row.key)}
            />
          </TableCell>
        </TableRow>
      )),
    }))
  }, [rows, onRemoveGroup, onRemoveRow, onChangeRow, t])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {t("loan.collections.batch.contracts_hint")}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPickerOpenChange(true)}
        >
          <Plus className="mr-1 size-3.5" />
          {t("loan.disbursements.batch.add_contracts")}
        </Button>
      </div>
      <PlanGroupedTable
        groups={groups}
        headerCells={<CollectionHeaderCells />}
        emptyLabel={t("loan.collections.batch.empty")}
      />
      <PostingRulesPreview documentType="LNM_COLLECTION" />
      <ChooseContractDialog
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        onPick={(selection) => onAddRows([selection])}
        multi
      />
    </div>
  )
}

function CollectionHeaderCells() {
  const { t } = useI18n()
  return (
    <>
      <BatchGridHead label={t("loan.batch_grid.col_contract")} />
      <BatchGridHead label={t("loan.field.agreement_code")} />
      <BatchGridHead label={t("loan.collections.batch.col_principal")} />
      <BatchGridHead label={t("loan.collections.batch.col_interest")} />
      <BatchGridHead label={t("loan.collections.batch.col_overdue_interest")} />
      <BatchGridHead label="" className="w-10" />
    </>
  )
}
