import { describe, expect, test } from "bun:test"
import { statusTone } from "./status-tone"

describe("statusTone", () => {
  test("maps backend lifecycle codes, case-insensitively", () => {
    expect(statusTone("PENDING_APPROVAL")).toBe("pending")
    expect(statusTone("approved")).toBe("success")
    expect(statusTone("POSTED")).toBe("posted")
    expect(statusTone("REJECTED")).toBe("danger")
    expect(statusTone("RUNNING")).toBe("info")
    expect(statusTone("CANCELLED")).toBe("neutral")
  })

  test("partially paid is still waiting, unknown codes are neutral", () => {
    expect(statusTone("PARTIALLY_PAID")).toBe("pending")
    expect(statusTone("SOMETHING_NEW")).toBe("neutral")
    expect(statusTone(null)).toBe("neutral")
  })

  test("unlisted codes follow the PENDING_* / *_FAILED convention", () => {
    expect(statusTone("PENDING_AMENDMENT")).toBe("pending")
    expect(statusTone("SYNC_FAILED")).toBe("danger")
  })
})
