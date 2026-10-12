import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanAdjustment } from "@workspace/api/generated/loan-v1"
export type { LoanAdjustment }

export const loanAdjustmentKinds = [
  { key: "debt-change", labelKey: "loan.kind.debt_change" },
  { key: "rate-change", labelKey: "loan.kind.rate_change" },
  { key: "restructure", labelKey: "loan.kind.restructure" },
  { key: "waiver", labelKey: "loan.kind.waiver" },
  { key: "writeoff", labelKey: "loan.kind.writeoff" },
  { key: "recovery", labelKey: "loan.kind.recovery" },
  { key: "fund-check", labelKey: "loan.kind.fund_check" },
  { key: "revenue-allocation", labelKey: "loan.kind.revenue_allocation" },
  { key: "vfu-fee-allocation", labelKey: "loan.kind.vfu_fee_allocation" },
  { key: "off-balance-export", labelKey: "loan.kind.off_balance_export" },
  { key: "mortgage-adjust", labelKey: "loan.kind.mortgage_adjust" },
] as const

export type LoanAdjustmentKind = (typeof loanAdjustmentKinds)[number]["key"]

/**
 * Summary column spec per kind — `adjustmentFields(kind)` feeds the
 * adjustment list grid (tab 2) so each kind shows its own "main" column
 * (amount / percent / rate / reason / result...) instead of a generic one.
 * `labelKeys` are full i18n keys (loan.adjustment_screen.field.*), except
 * the `kind` entry which reuses `loan.kind.*`.
 */
export interface AdjustmentFieldSpec {
  /** Key in the top-level LoanAdjustment row, or prefixed "payload." for the jsonb. */
  field: string
  labelKey: string
  type: "money" | "percent" | "text"
  /** When the row has neither this field nor `orField`, the cell shows "—". */
  orField?: string
}

const ADJUSTMENT_LIST_FIELDS: Record<
  LoanAdjustmentKind,
  AdjustmentFieldSpec[]
> = {
  "debt-change": [
    {
      field: "payload.to_debt_group_code",
      labelKey: "loan.adjustment_field.to_debt_group_code",
      type: "text",
    },
  ],
  "rate-change": [
    {
      field: "payload.new_rate",
      labelKey: "loan.adjustment_field.new_rate",
      type: "percent",
    },
  ],
  restructure: [
    {
      field: "payload.new_term",
      labelKey: "loan.adjustment_field.new_term",
      type: "text",
    },
    {
      field: "payload.new_maturity_date",
      labelKey: "loan.adjustment_field.new_maturity_date",
      type: "text",
    },
  ],
  waiver: [
    {
      field: "amount_minor",
      labelKey: "loan.field.amount",
      type: "money",
      orField: "payload.waiver_percent",
    },
  ],
  writeoff: [
    {
      field: "amount_minor",
      labelKey: "loan.field.amount",
      type: "money",
    },
    {
      field: "payload.reason",
      labelKey: "loan.adjustment_field.reason",
      type: "text",
    },
  ],
  recovery: [
    {
      field: "amount_minor",
      labelKey: "loan.field.amount",
      type: "money",
    },
    {
      field: "agreement_code",
      labelKey: "loan.field.agreement_code",
      type: "text",
    },
  ],
  "fund-check": [
    {
      field: "payload.result",
      labelKey: "loan.adjustment_field.result",
      type: "text",
    },
  ],
  "revenue-allocation": [
    {
      field: "amount_minor",
      labelKey: "loan.field.amount",
      type: "money",
    },
  ],
  "vfu-fee-allocation": [
    {
      field: "amount_minor",
      labelKey: "loan.field.amount",
      type: "money",
    },
  ],
  "off-balance-export": [
    {
      field: "payload.reason",
      labelKey: "loan.adjustment_field.reason",
      type: "text",
    },
  ],
  "mortgage-adjust": [
    {
      field: "decision_note",
      labelKey: "loan.field.note",
      type: "text",
    },
  ],
}

/** Kind → the "main" summary column(s) for the list grid (tab 2). */
export function adjustmentFields(
  kind: LoanAdjustmentKind
): AdjustmentFieldSpec[] {
  return ADJUSTMENT_LIST_FIELDS[kind] ?? []
}

/** Reads a (possibly payload-nested) field path from an adjustment row. */
export function adjustmentFieldValue(
  item: LoanAdjustment,
  field: string
): string | number | undefined {
  if (field.startsWith("payload.")) {
    const key = field.slice("payload.".length)
    const value = (item.payload as Record<string, unknown> | null | undefined)?.[key]
    return typeof value === "number" || typeof value === "string"
      ? value
      : undefined
  }
  const value = (item as unknown as Record<string, unknown>)[field]
  return typeof value === "number" || typeof value === "string"
    ? value
    : undefined
}

export const adjustmentsApi = {
  /**
   * Per-kind adjustment list. With `page` set the call runs server-paged
   * (BE listEnvelope paginates in memory over the LIMIT-500 slice); without
   * it the legacy fetch-all (`all=true`) applies for dropdown lookups.
   */
  listAdjustments: (
    kind: LoanAdjustmentKind,
    params: {
      contract_code?: string
      status?: string
      page?: number
      per_page?: number
    } = {}
  ) => {
    const search = listQuery({
      contract_code: params.contract_code,
      status: params.status,
      page: params.page,
      per_page: params.per_page,
    })
    return getCanonicalList<LoanAdjustment>(
      `/api/loan/adjustments/${kind}?${search.toString()}`
    )
  },
  createAdjustment: (
    kind: LoanAdjustmentKind,
    body: Partial<LoanAdjustment> & { payload?: Record<string, unknown> }
  ) => postCanonical<LoanAdjustment>(`/api/loan/adjustments/${kind}`, body),
  getAdjustment: (kind: LoanAdjustmentKind, id: string) =>
    getCanonical<LoanAdjustment>(
      `/api/loan/adjustments/${kind}/${encodeURIComponent(id)}`
    ),
  submitAdjustment: (kind: LoanAdjustmentKind, id: string) =>
    postCanonical<LoanAdjustment>(
      `/api/loan/adjustments/${kind}/${encodeURIComponent(id)}/submit`,
      {}
    ),
}
