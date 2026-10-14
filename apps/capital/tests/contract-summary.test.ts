import { describe, expect, test } from "bun:test"
import type { CapitalMovement, ContractDetail } from "../src/features/api"
import {
  contractLifecycle,
  daysBetween,
  maturityTone,
  summarizeContract,
} from "../src/features/contracts/contract-summary"

const movement = (
  id: string,
  type: string,
  amountMinor: number,
  status: string,
  date = "2026-03-01"
): CapitalMovement => ({
  id,
  tenant_id: "t",
  contract_id: "c1",
  movement_type: type,
  amount_minor: amountMinor,
  currency_code: "VND",
  movement_date: date,
  status,
  created_by: "maker",
})

function detail(
  movements: CapitalMovement[] = [],
  overrides: Partial<ContractDetail["contract"]> = {}
): ContractDetail {
  return {
    contract: {
      id: "c1",
      tenant_id: "t",
      contract_code: "HDV-001",
      fund_type_code: "ODA",
      counterparty_code: "NH01",
      contract_date: "2026-01-15",
      maturity_date: "2027-01-15",
      amount_minor: 1_000_000_000,
      interest_rate: 6.5,
      currency_code: "VND",
      status: "ACTIVE",
      created_by: "maker",
      ...overrides,
    },
    movements,
    amendments: [],
  }
}

describe("summarizeContract", () => {
  test("counts only POSTED movements and mirrors the BE availability guard", () => {
    const summary = summarizeContract(
      detail([
        movement("m1", "RECEIPT", 600_000_000, "POSTED"),
        movement("m2", "RECEIPT", 200_000_000, "SUBMITTED"),
        movement("m3", "DISBURSEMENT", 150_000_000, "POSTED"),
        movement("m4", "PAYMENT", 20_000_000, "POSTED"),
        movement("m5", "DISBURSEMENT", 99_000_000, "REJECTED"),
        movement("m6", "PAYMENT", 5_000_000, "SUBMITTED"),
      ]),
      "2026-06-01"
    )
    expect(summary.amountMinor).toBe(1_000_000_000)
    expect(summary.receivedMinor).toBe(600_000_000)
    expect(summary.outflowMinor).toBe(170_000_000)
    expect(summary.availableMinor).toBe(430_000_000)
    expect(summary.postedCount).toBe(3)
    expect(summary.pendingCount).toBe(2)
    expect(summary.settledOn).toBeNull()
  })

  test("an empty contract has zero figures", () => {
    const summary = summarizeContract(detail(), "2026-06-01")
    expect(summary.receivedMinor).toBe(0)
    expect(summary.availableMinor).toBe(0)
    expect(summary.postedCount).toBe(0)
    expect(summary.pendingCount).toBe(0)
  })

  test("reports the posted settlement date and days to maturity", () => {
    const summary = summarizeContract(
      detail(
        [
          movement("m1", "RECEIPT", 100, "POSTED", "2026-02-01"),
          movement("m2", "SETTLEMENT", 100, "POSTED", "2026-05-20"),
        ],
        { status: "CLOSED" }
      ),
      "2026-12-15"
    )
    expect(summary.settledOn).toBe("2026-05-20")
    expect(summary.availableMinor).toBe(0)
    expect(summary.daysToMaturity).toBe(31)
  })

  test("a contract without maturity has no countdown", () => {
    const summary = summarizeContract(
      detail([], { maturity_date: undefined }),
      "2026-06-01"
    )
    expect(summary.daysToMaturity).toBeNull()
  })
})

describe("daysBetween", () => {
  test("handles timestamps, past dates and bad input", () => {
    expect(daysBetween("2026-06-01", "2026-06-01T00:00:00Z")).toBe(0)
    expect(daysBetween("2026-06-10", "2026-06-01")).toBe(-9)
    expect(daysBetween("2026-06-01", "not-a-date")).toBeNull()
    expect(daysBetween("2026-06-01")).toBeNull()
  })
})

describe("contractLifecycle", () => {
  test("follows PENDING_APPROVAL → ACTIVE → CLOSED with a REJECTED branch", () => {
    expect(contractLifecycle("PENDING_APPROVAL")).toEqual({
      approval: "current",
      active: "todo",
      settled: "todo",
      rejected: false,
    })
    expect(contractLifecycle("REJECTED")).toEqual({
      approval: "current",
      active: "todo",
      settled: "todo",
      rejected: true,
    })
    expect(contractLifecycle("ACTIVE")).toEqual({
      approval: "done",
      active: "current",
      settled: "todo",
      rejected: false,
    })
    expect(contractLifecycle("CLOSED")).toEqual({
      approval: "done",
      active: "done",
      settled: "done",
      rejected: false,
    })
    expect(contractLifecycle("UNKNOWN").approval).toBe("todo")
  })
})

describe("maturityTone", () => {
  test("flags active contracts near or past maturity", () => {
    expect(maturityTone("ACTIVE", -1)).toBe("danger")
    expect(maturityTone("ACTIVE", 0)).toBe("warning")
    expect(maturityTone("ACTIVE", 30)).toBe("warning")
    expect(maturityTone("ACTIVE", 31)).toBe("default")
    expect(maturityTone("CLOSED", -100)).toBe("default")
    expect(maturityTone("ACTIVE", null)).toBe("default")
  })
})
