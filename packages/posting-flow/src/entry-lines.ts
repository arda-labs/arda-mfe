import type { EntryLineRow } from "./types"
import { parseMoneyInput, toMinor } from "@workspace/format"

export interface EntryTotals {
  totalDebitMinor: number
  totalCreditMinor: number
  balanced: boolean
}

let rowSeq = 0

/** Next stable client row id — client-only, never sent to the BE. */
export function newEntryLineRow(overrides: Partial<EntryLineRow> = {}): EntryLineRow {
  rowSeq += 1
  return {
    id: `line-${rowSeq}`,
    direction: "DEBIT",
    account_code: "",
    account_name: "",
    amount: "",
    description: "",
    ...overrides,
  }
}

/** Sums the rows per direction in minor units (quantized per currency). */
export function computeTotals(rows: EntryLineRow[], currency: string): EntryTotals {
  const toMinorOf = (raw: string): number => {
    const major = parseMoneyInput(raw)
    return major === undefined ? 0 : toMinor(major, currency)
  }
  let totalDebitMinor = 0
  let totalCreditMinor = 0
  for (const row of rows) {
    const minor = toMinorOf(row.amount)
    if (row.direction === "DEBIT") totalDebitMinor += minor
    else totalCreditMinor += minor
  }
  return { totalDebitMinor, totalCreditMinor, balanced: totalDebitMinor === totalCreditMinor }
}
