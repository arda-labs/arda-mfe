import { api, type ApiSuccess } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

export interface StatementSummary {
  statement_code: string
  row_count: number
}

/** One rendered statement line (fin_statement_formula row, evaluated). */
export interface StatementRow {
  row_code: string
  parent_code?: string
  label: string
  level: number
  sort_order: number
  is_total: boolean
  amount_minor: number
  has_amount: boolean
}

export interface StatementResult {
  tenant_id: string
  statement_code: string
  as_of: string
  from_date?: string
  coa_version?: string
  rows: StatementRow[]
}

export interface FinancialSummary {
  as_of: string
  from_date?: string
  total_assets_minor: number
  total_liabilities_minor: number
  total_equity_minor: number
  total_income_minor: number
  total_expense_minor: number
  profit_minor: number
}

export interface RiskException {
  account_code: string
  currency_code: string
  coa_version: string
  close_debit_minor: number
  close_credit_minor: number
  reason: string
}

/** Statements (P3b) — fixed-format reports over fin_trial_balance_daily. */
export const statementsApi = {
  listStatements: () =>
    api
      .get<ApiSuccess<{ statements: StatementSummary[] }>>(
        "/api/finance/statements"
      )
      .then((res) => res.result.statements),
  runStatement: (
    code: string,
    asOf?: string,
    coaVersion?: string,
    from?: string
  ) => {
    const p = buildSearchParams({ as_of: asOf, coa_version: coaVersion, from })
    return api
      .get<ApiSuccess<StatementResult>>(
        `/api/finance/statements/${encodeURIComponent(code)}/run?${p.toString()}`
      )
      .then((res) => res.result)
  },
  financialSummary: (asOf?: string, from?: string) => {
    const p = buildSearchParams({ as_of: asOf, from })
    return api
      .get<ApiSuccess<FinancialSummary>>(
        `/api/finance/reports/financial-summary?${p.toString()}`
      )
      .then((res) => res.result)
  },
  riskExceptions: (asOf?: string) => {
    const p = buildSearchParams({ as_of: asOf })
    return api
      .get<ApiSuccess<{ items: RiskException[] }>>(
        `/api/finance/reports/risk-exceptions?${p.toString()}`
      )
      .then((res) => res.result.items)
  },
}
