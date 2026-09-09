import { useMemo } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { Plus } from "lucide-react"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import type { LoanAgreement, LoanContract } from "../../api"
import { ChooseContractDialog } from "../../loan-batches/components/choose-contract-dialog"
import {
  BatchGridHead,
  BatchGridRemoveRowButton,
  PlanGroupedTable,
} from "../../loan-batches/components/plan-grouped-table"
import { headroomMinor, inputToMinor } from "../../loan-batches/row-math"
import type { RegisterRow } from "./page"

function rowAmountMinor(row: RegisterRow): number {
  return inputToMinor(row.amount, row.agreement.currency_code)
}

/**
 * Tab 2 "Danh sách hợp đồng tín dụng" of the register batch: grid gom nhóm
 * theo plan_code (mỗi dòng 1 hợp đồng + số tiền giải ngân riêng), tổng nhóm
 * readonly = Σ dòng, nút Xoá nhóm / Xoá dòng, and the multi-pick
 * ChooseContractDialog. Presentational — row state lives in page.tsx.
 */
export function RegisterContractsTab({
  rows,
  pickerOpen,
  onPickerOpenChange,
  onAddRows,
  onChangeRow,
  onRemoveRow,
  onRemoveGroup,
}: {
  rows: RegisterRow[]
  pickerOpen: boolean
  onPickerOpenChange: (open: boolean) => void
  onAddRows: (picked: (LoanAgreement & { contract: LoanContract })[]) => void
  onChangeRow: (key: string, patch: Partial<RegisterRow>) => void
  onRemoveRow: (key: string) => void
  onRemoveGroup: (planCode: string) => void
}) {
  const { t } = useI18n()

  const groups = useMemo(() => {
    const byPlan = new Map<string, RegisterRow[]>()
    for (const row of rows) {
      const planCode = row.agreement.plan_code ?? ""
      const bucket = byPlan.get(planCode) ?? []
      bucket.push(row)
      byPlan.set(planCode, bucket)
    }
    return [...byPlan.entries()].map(([planCode, groupRows]) => ({
      planCode,
      totalMinor: groupRows.reduce((sum, row) => sum + rowAmountMinor(row), 0),
      currency: groupRows[0]?.agreement.currency_code ?? "VND",
      onRemove: () => onRemoveGroup(planCode),
      rows: groupRows.map((row) => (
        <TableRow key={row.key}>
          <TableCell className="font-mono text-xs">
            {row.contract.contract_no || row.contract.contract_code}
          </TableCell>
          <TableCell className="whitespace-nowrap text-xs">
            {row.contract.contract_date ? formatDateShort(row.contract.contract_date) : "—"}
          </TableCell>
          <TableCell className="text-xs">{row.contract.customer_code}</TableCell>
          <TableCell>
            <Input
              className="h-8 w-36 text-right tabular-nums"
              inputMode="decimal"
              value={row.amount}
              placeholder="0"
              onChange={(e) => onChangeRow(row.key, { amount: e.target.value })}
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t("loan.disbursements.batch.headroom_hint", {
                amount: formatAmount(
                  fromMinor(headroomMinor(row.contract, row.agreement)),
                  row.agreement.currency_code
                ),
              })}
            </p>
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
          {t("loan.disbursements.batch.contracts_hint")}
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
        headerCells={<RegisterHeaderCells />}
        emptyLabel={t("loan.disbursements.batch.empty")}
      />
      <ChooseContractDialog
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        onPick={(selection) => onAddRows([selection])}
        multi
      />
    </div>
  )
}

function RegisterHeaderCells() {
  const { t } = useI18n()
  return (
    <>
      <BatchGridHead label={t("loan.batch_grid.col_contract")} />
      <BatchGridHead label={t("loan.batch_grid.col_from")} />
      <BatchGridHead label={t("loan.batch_grid.col_customer")} />
      <BatchGridHead label={t("loan.disbursements.batch.col_amount")} />
      <BatchGridHead label="" className="w-10" />
    </>
  )
}
