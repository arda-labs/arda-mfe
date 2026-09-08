import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { currencyDecimals, formatAmount } from "@workspace/format"
import { ChooseAccountDialog } from "./choose-account-dialog"
import { computeTotals, newEntryLineRow } from "./entry-lines"
import {
  type AccountOption,
  type EntryLineRow,
  type EntryLinesGridLabels,
  type FetchAccountsFn,
  type PostingDirection,
} from "./types"

/**
 * Flat editable journal-line grid (FAC bút toán lẻ / bút toán kép):
 * STT · direction (Nợ/Có, lockable) · account (picker) · auto-filled account
 * name · amount · description. Controlled by the screen; every change is
 * reported through `onRowsChange` so the screen stays the single source of
 * truth and re-derives totals with `computeTotals`.
 */
export function EntryLinesGrid({
  rows,
  onRowsChange,
  labels,
  currency,
  canAddRows = false,
  canDeleteRows = false,
  minRows = 0,
  fetchAccounts,
}: {
  rows: EntryLineRow[]
  onRowsChange: (rows: EntryLineRow[]) => void
  labels: EntryLinesGridLabels
  currency: string
  canAddRows?: boolean
  canDeleteRows?: boolean
  /** Rows below this count cannot be deleted (e.g. pinned Nợ/Có pair). */
  minRows?: number
  fetchAccounts: FetchAccountsFn
}) {
  const decimals = currencyDecimals(currency)

  const update = (id: string, patch: Partial<EntryLineRow>) => {
    onRowsChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    onRowsChange([...rows, newEntryLineRow()])
  }

  const deleteRow = (id: string) => {
    if (rows.length <= minRows) return
    onRowsChange(rows.filter((row) => row.id !== id))
  }

  const totals = computeTotals(rows, currency)
  const [pickerRowId, setPickerRowId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">{labels.colNo}</TableHead>
              <TableHead className="w-28">{labels.colDirection}</TableHead>
              <TableHead className="w-40">{labels.colAccount}</TableHead>
              <TableHead>{labels.colAccountName}</TableHead>
              <TableHead className="w-40 text-right">{labels.colAmount}</TableHead>
              <TableHead>{labels.colDescription}</TableHead>
              {canDeleteRows ? <TableHead className="w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Select
                    value={row.direction}
                    disabled={row.pinnedDirection}
                    onValueChange={(value) =>
                      update(row.id, { direction: value as PostingDirection })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBIT">{labels.debit}</SelectItem>
                      <SelectItem value="CREDIT">{labels.credit}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start font-mono text-xs"
                    title={labels.chooseAccount}
                    onClick={() => setPickerRowId(row.id)}
                  >
                    {row.account_code || labels.chooseAccount}
                  </Button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.account_name || "—"}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-right tabular-nums"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => update(row.id, { amount: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8"
                    value={row.description}
                    onChange={(e) => update(row.id, { description: e.target.value })}
                  />
                </TableCell>
                {canDeleteRows ? (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={rows.length <= minRows}
                      aria-label={labels.deleteRow}
                      title={labels.deleteRow}
                      onClick={() => deleteRow(row.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canAddRows ? (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 size-3.5" />
            {labels.addRow}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {labels.totalDebit}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(totals.totalDebitMinor / 10 ** decimals, currency)}
            </span>
          </span>
          <span className="text-muted-foreground">
            {labels.totalCredit}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(totals.totalCreditMinor / 10 ** decimals, currency)}
            </span>
          </span>
        </div>
      </div>

      <ChooseAccountDialog
        open={pickerRowId !== null}
        onOpenChange={(open) => {
          if (!open) setPickerRowId(null)
        }}
        fetchAccounts={fetchAccounts}
        onSelect={(account: AccountOption) => {
          if (pickerRowId) update(pickerRowId, { account_code: account.code, account_name: account.name })
        }}
        labels={labels.accountDialog}
      />
    </div>
  )
}
