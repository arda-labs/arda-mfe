import { describe, expect, test } from "bun:test"
import type { LoanDossier } from "../src/features/api"
import {
  dossierLifecycle,
  summarizeDossier,
} from "../src/features/loan/dossier/dossier-summary"

const plan = (termNo: number, toDate: string, paid: boolean) => ({
  agreement_code: "KU1",
  coln_interest_amt_minor: paid ? 2_000_000 : 0,
  coln_principal_amt_minor: paid ? 30_000_000 : 0,
  contract_code: "HD1",
  created_at: "",
  from_date: "",
  id: `p${termNo}`,
  interest_rate: 9.6,
  is_active: true,
  lifecycle_status: "ACTIVE",
  payment_status: paid ? "PAID" : "PLANNED",
  plan_interest_amt_minor: 2_000_000,
  plan_no: 1,
  plan_principal_amt_minor: 30_000_000,
  tenant_id: "t",
  term_no: termNo,
  to_date: toDate,
  updated_at: "",
})

function dossier(overrides: Partial<LoanDossier> = {}): LoanDossier {
  return {
    agreements: [],
    collaterals: [],
    mortgages: [],
    workflow_case_ids: [],
    contract: { loan_amt_minor: 500_000_000, status: "ACTIVE" } as LoanDossier["contract"],
    disbursements: [
      { disburse_amt_minor: 200_000_000, status: "POSTED" },
      { disburse_amt_minor: 160_000_000, status: "POSTED" },
      { disburse_amt_minor: 140_000_000, status: "CANCELLED" },
    ] as LoanDossier["disbursements"],
    collections: [
      { principal_minor: 90_000_000, interest_minor: 7_920_000, status: "POSTED" },
    ] as LoanDossier["collections"],
    repay_plans: [
      plan(1, "2026-07-25", true),
      plan(2, "2026-08-25", true),
      plan(3, "2026-09-25", true),
      plan(4, "2026-10-25", false),
      plan(5, "2026-11-25", false),
    ],
    ...overrides,
  }
}

describe("summarizeDossier", () => {
  test("figures ignore voided movements", () => {
    const s = summarizeDossier(dossier(), "2026-10-13")
    expect(s.disbursedMinor).toBe(360_000_000)
    expect(s.disbursementCount).toBe(2)
    expect(s.outstandingMinor).toBe(270_000_000)
    expect(s.paidTerms).toBe(3)
    expect(s.totalTerms).toBe(5)
    expect(s.overdueTerms).toBe(0)
    expect(s.nextDue).toEqual({ termNo: 4, date: "2026-10-25", amountMinor: 32_000_000 })
  })

  test("an unpaid term in the past counts as overdue", () => {
    const s = summarizeDossier(dossier(), "2026-11-01")
    expect(s.overdueTerms).toBe(1)
    expect(s.nextDue?.termNo).toBe(5)
  })

  test("lifecycle: partly disbursed contract is disbursing and repaying", () => {
    const life = dossierLifecycle(summarizeDossier(dossier(), "2026-10-13"))
    expect(life).toEqual({ disbursement: "current", repayment: "current", settled: "todo" })
  })

  test("a partially paid term is still open", () => {
    const plans = dossier().repay_plans.map((item) =>
      item.term_no === 4 ? { ...item, payment_status: "PARTIALLY_PAID" } : item
    )
    const s = summarizeDossier(dossier({ repay_plans: plans }), "2026-10-13")
    expect(s.paidTerms).toBe(3)
    expect(s.nextDue?.termNo).toBe(4)
  })

  test("lifecycle: closed contract is settled", () => {
    const closed = dossier({
      contract: { loan_amt_minor: 1, status: "CLOSED" } as LoanDossier["contract"],
    })
    expect(dossierLifecycle(summarizeDossier(closed, "2026-10-13")).settled).toBe("done")
  })
})
