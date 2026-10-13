import { describe, expect, test } from "bun:test"
import { newEntryLineRow } from "@workspace/posting-flow/entry-lines"
import { postingChecklist } from "../src/features/finance/posting/checklist"

const row = (account: string, amount: string, direction: "DEBIT" | "CREDIT" = "DEBIT") =>
  newEntryLineRow({ account_code: account, amount, direction })

const base = {
  accountingDate: "2026-10-13",
  currency: "VND",
  rows: [row("1011", "1000"), row("7110", "1000", "CREDIT")],
  requireBalanced: true,
  balanced: true,
  description: "Thu phí",
  attachmentCount: 1,
}

const states = (input: Partial<typeof base>) =>
  Object.fromEntries(postingChecklist({ ...base, ...input }).map((c) => [c.id, c.state]))

describe("postingChecklist", () => {
  test("a complete posting passes every check", () => {
    expect(Object.values(states({})).every((s) => s === "ok")).toBe(true)
  })

  test("missing accounts and zero amounts are errors with a row count", () => {
    const checks = postingChecklist({ ...base, rows: [row("", "0"), row("", "5")] })
    expect(checks.find((c) => c.id === "accounts")).toEqual({ id: "accounts", state: "error", count: 2 })
    expect(checks.find((c) => c.id === "amounts")).toEqual({ id: "amounts", state: "error", count: 1 })
  })

  test("balance is only checked when required", () => {
    expect(states({ balanced: false }).balanced).toBe("error")
    expect(states({ balanced: false, requireBalanced: false }).balanced).toBeUndefined()
  })

  test("description and attachments only warn", () => {
    const s = states({ description: " ", attachmentCount: 0 })
    expect(s.description).toBe("warning")
    expect(s.attachments).toBe("warning")
  })

  test("bad date or currency blocks", () => {
    expect(states({ accountingDate: "2026-02-30" }).date).toBe("error")
    expect(states({ currency: "VN" }).currency).toBe("error")
  })
})
