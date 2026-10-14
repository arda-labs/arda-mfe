import { describe, expect, test } from "bun:test"
import type { IbmDetail, SavingsDetail } from "../src/features/api"
import { termProgress } from "../src/lib/term-progress"
import { savingsLifecycle, summarizeSavings } from "../src/features/savings/savings-summary"
import { interbankLifecycle, summarizeInterbank } from "../src/features/interbank/interbank-summary"

describe("termProgress", () => {
  test("counts calendar days and the elapsed share of the term", () => {
    expect(termProgress("2026-01-01", "2026-12-31", "2026-07-02")).toEqual({
      totalDays: 364,
      daysToMaturity: 182,
      elapsed: 0.5,
    })
  })

  test("ignores a time part and clamps before start / after maturity", () => {
    expect(termProgress("2026-03-01T00:00:00Z", "2026-03-11", "2026-02-20").elapsed).toBe(0)
    const late = termProgress("2026-03-01", "2026-03-11", "2026-03-15")
    expect(late.elapsed).toBe(1)
    expect(late.daysToMaturity).toBe(-4)
  })

  test("has no term without usable dates", () => {
    expect(termProgress("", "2026-03-11", "2026-03-01")).toEqual({
      totalDays: 0,
      daysToMaturity: 10,
      elapsed: undefined,
    })
    expect(termProgress("2026-03-11", "2026-03-01", "2026-03-05").totalDays).toBe(0)
  })
})

function savingsDetail(overrides: Partial<SavingsDetail> = {}): SavingsDetail {
  return {
    savings: {
      principal_minor: 100_000_000,
      accrued_minor: 1_500_000,
      currency_code: "VND",
      open_date: "2026-01-01",
      maturity_date: "2027-01-01",
      status: "ACTIVE",
    } as SavingsDetail["savings"],
    accruals: [
      { rate: 5.2, period_to: "2026-03-31", created_at: "2026-03-31T10:00:00Z" },
      { rate: 5.5, period_to: "2026-05-31", created_at: "2026-05-31T10:00:00Z" },
      { rate: 5.0, period_to: "2026-01-31", created_at: "2026-01-31T10:00:00Z" },
    ] as SavingsDetail["accruals"],
    interest_ops: [
      { op_type: "PAY", status: "POSTED", amount_minor: 400_000, rate: 5.2, created_at: "2026-04-01" },
      { op_type: "PAY", status: "REJECTED", amount_minor: 900_000, rate: 5.2, created_at: "2026-04-02" },
      { op_type: "CAPITALIZE", status: "POSTED", amount_minor: 300_000, rate: 5.5, created_at: "2026-06-01" },
      { op_type: "PAY", status: "SUBMITTED", amount_minor: 200_000, rate: 5.5, created_at: "2026-06-02" },
      { op_type: "PAY", status: "POSTING", amount_minor: 100_000, rate: 5.5, created_at: "2026-06-03" },
    ] as SavingsDetail["interest_ops"],
    transactions: [],
    ...overrides,
  }
}

describe("summarizeSavings", () => {
  test("derives figures from the detail payload", () => {
    const summary = summarizeSavings(savingsDetail(), "2026-12-02")
    expect(summary).toMatchObject({
      principalMinor: 100_000_000,
      accruedMinor: 1_500_000,
      currencyCode: "VND",
      rate: 5.5,
      interestPaidMinor: 400_000,
      capitalizedMinor: 300_000,
      pendingInterestOps: 2,
      active: true,
      closed: false,
    })
    expect(summary?.term.daysToMaturity).toBe(30)
    expect(summary?.term.totalDays).toBe(365)
  })

  test("falls back to the latest interest op rate, then to none", () => {
    expect(summarizeSavings(savingsDetail({ accruals: null }), "2026-06-01")?.rate).toBe(5.5)
    expect(
      summarizeSavings(savingsDetail({ accruals: [], interest_ops: null }), "2026-06-01")?.rate
    ).toBeNull()
  })

  test("returns null without a savings book", () => {
    expect(summarizeSavings(savingsDetail({ savings: null }), "2026-06-01")).toBeNull()
  })
})

describe("savingsLifecycle", () => {
  test("maps the statuses deposit-service emits", () => {
    expect(savingsLifecycle("ACTIVE")).toEqual({ opened: "done", holding: "current", settled: "todo" })
    expect(savingsLifecycle("CLOSED")).toEqual({ opened: "done", holding: "done", settled: "done" })
    expect(savingsLifecycle("UNKNOWN")).toBeNull()
  })
})

function ibmDetail(overrides: Partial<IbmDetail> = {}): IbmDetail {
  return {
    deposit: {
      principal_minor: 5_000_000_000,
      accrued_minor: 20_000_000,
      currency_code: "VND",
      interest_rate: 4.75,
      deposit_date: "2026-09-01",
      maturity_date: "2026-12-01",
      status: "ACTIVE",
    } as IbmDetail["deposit"],
    movements: [
      { kind: "TOP_UP", status: "POSTED", amount_minor: 1_000_000_000 },
      { kind: "TOP_UP", status: "REJECTED", amount_minor: 7_000_000_000 },
      { kind: "WITHDRAW", status: "POSTED", amount_minor: 500_000_000 },
      { kind: "INTEREST", status: "POSTED", amount_minor: 15_000_000 },
      { kind: "EXPECTED", status: "SUBMITTED", amount_minor: 3_000_000 },
      { kind: "WITHDRAW", status: "DRAFT", amount_minor: 100_000_000 },
    ] as IbmDetail["movements"],
    ...overrides,
  }
}

describe("summarizeInterbank", () => {
  test("derives figures from the detail payload", () => {
    const summary = summarizeInterbank(ibmDetail(), "2026-11-21")
    expect(summary).toMatchObject({
      principalMinor: 5_000_000_000,
      accruedMinor: 20_000_000,
      rate: 4.75,
      toppedUpMinor: 1_000_000_000,
      withdrawnMinor: 500_000_000,
      interestCollectedMinor: 15_000_000,
      pendingMovements: 2,
      active: true,
    })
    expect(summary?.term.daysToMaturity).toBe(10)
  })

  test("tolerates a null movement list and a missing contract", () => {
    expect(summarizeInterbank(ibmDetail({ movements: null }), "2026-10-01")?.pendingMovements).toBe(0)
    expect(summarizeInterbank(ibmDetail({ deposit: null }), "2026-10-01")).toBeNull()
  })
})

describe("interbankLifecycle", () => {
  test("maps the statuses deposit-service emits", () => {
    expect(interbankLifecycle("PENDING_APPROVAL")).toEqual({
      submitted: "done",
      approved: "current",
      effective: "todo",
    })
    expect(interbankLifecycle("ACTIVE")).toEqual({
      submitted: "done",
      approved: "done",
      effective: "current",
    })
    expect(interbankLifecycle("REJECTED")).toBeNull()
  })
})
