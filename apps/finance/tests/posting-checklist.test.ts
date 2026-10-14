import { describe, expect, test } from "bun:test"
import { newEntryLineRow } from "@workspace/posting-flow/entry-lines"
import {
  cancellationChecklist,
  closingChecklist,
  offBalanceChecklist,
  postingChecklist,
  toChecklistItems,
  type PostingCheck,
} from "../src/features/finance/posting/checklist"

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

const byId = (checks: PostingCheck[]) => Object.fromEntries(checks.map((c) => [c.id, c.state]))

describe("cancellationChecklist", () => {
  const ok = {
    accountingDate: "2026-10-13",
    hasReference: true,
    original: { status: "POSTED" } as { status: string; reversedByEntryId?: string } | undefined,
    reason: "Nhập sai số tiền",
    attachmentCount: 1,
  }

  test("a posted original with a reason passes", () => {
    expect(Object.values(byId(cancellationChecklist(ok))).every((s) => s === "ok")).toBe(true)
  })

  test("date, original and reason are required", () => {
    const s = byId(
      cancellationChecklist({ ...ok, accountingDate: "", hasReference: false, original: undefined, reason: " " })
    )
    expect(s.date).toBe("error")
    expect(s.reference).toBe("error")
    expect(s.reason).toBe("error")
    // Nothing to verify until an original is picked.
    expect(s.reversible).toBeUndefined()
  })

  test("only a POSTED, not yet reversed original can be cancelled", () => {
    expect(byId(cancellationChecklist({ ...ok, original: { status: "REVERSED" } })).reversible).toBe("error")
    expect(
      byId(cancellationChecklist({ ...ok, original: { status: "POSTED", reversedByEntryId: "re-1" } })).reversible
    ).toBe("error")
  })

  test("an original whose detail is not loaded only warns, with its own hint", () => {
    const check = cancellationChecklist({ ...ok, original: undefined }).find((c) => c.id === "reversible")
    expect(check).toEqual({ id: "reversible", state: "warning", hintId: "reversible_unknown" })
  })

  test("the reason is the description, so only attachments warn", () => {
    const s = byId(cancellationChecklist({ ...ok, attachmentCount: 0 }))
    expect(s.attachments).toBe("warning")
    expect(s.description).toBeUndefined()
  })
})

describe("closingChecklist", () => {
  const ok = {
    accountingDate: "2026-12-31",
    rowCount: 3,
    loading: false,
    description: "Kết chuyển thu chi kỳ Năm",
    attachmentCount: 1,
  }

  test("loaded rows on a valid date pass", () => {
    expect(Object.values(byId(closingChecklist(ok))).every((s) => s === "ok")).toBe(true)
  })

  test("no rows, or rows still loading, block", () => {
    expect(byId(closingChecklist({ ...ok, rowCount: 0 })).closing_rows).toBe("error")
    expect(byId(closingChecklist({ ...ok, loading: true })).closing_rows).toBe("error")
    expect(byId(closingChecklist({ ...ok, accountingDate: "2026-13-01" })).date).toBe("error")
  })

  test("description and attachments only warn", () => {
    const s = byId(closingChecklist({ ...ok, description: "", attachmentCount: 0 }))
    expect(s.description).toBe("warning")
    expect(s.attachments).toBe("warning")
  })
})

describe("offBalanceChecklist", () => {
  const ok = {
    accountingDate: "2026-10-13",
    currency: "VND",
    rows: [row("0011", "1000"), row("0012", "1000")],
    amount: "1000",
    description: "Nhập ngoại bảng",
    attachmentCount: 1,
  }

  test("a complete off-balance entry passes", () => {
    expect(Object.values(byId(offBalanceChecklist(ok))).every((s) => s === "ok")).toBe(true)
  })

  test("the one total must be above 0", () => {
    expect(byId(offBalanceChecklist({ ...ok, amount: "" })).amount).toBe("error")
    expect(byId(offBalanceChecklist({ ...ok, amount: "0" })).amount).toBe("error")
  })

  test("every line needs an account, counted for the hint", () => {
    const check = offBalanceChecklist({ ...ok, rows: [row("", "1000"), row("0012", "1000")] }).find(
      (c) => c.id === "accounts"
    )
    expect(check).toEqual({ id: "accounts", state: "error", count: 1 })
  })

  test("bad date or currency blocks; description and attachments warn", () => {
    const s = byId(
      offBalanceChecklist({ ...ok, accountingDate: "x", currency: "vn", description: "", attachmentCount: 0 })
    )
    expect(s.date).toBe("error")
    expect(s.currency).toBe("error")
    expect(s.description).toBe("warning")
    expect(s.attachments).toBe("warning")
  })
})

describe("toChecklistItems", () => {
  const t = (key: string, params?: Record<string, string | number>) =>
    params ? `${key}|${params.count}` : key

  test("labels by id, hints only on failing checks, hintId overrides the hint key", () => {
    const items = toChecklistItems(
      [
        { id: "date", state: "ok" },
        { id: "accounts", state: "error", count: 2 },
        { id: "reversible", state: "warning", hintId: "reversible_unknown" },
      ],
      t
    )
    expect(items).toEqual([
      { id: "date", state: "ok", label: "finance.posting.checklist.date", hint: undefined },
      {
        id: "accounts",
        state: "error",
        label: "finance.posting.checklist.accounts",
        hint: "finance.posting.checklist.accounts_hint|2",
      },
      {
        id: "reversible",
        state: "warning",
        label: "finance.posting.checklist.reversible",
        hint: "finance.posting.checklist.reversible_unknown_hint|0",
      },
    ])
  })
})
