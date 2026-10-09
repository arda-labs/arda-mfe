import { describe, expect, test } from "bun:test"
import { formatDateTime } from "../../packages/format/src/date"

describe("formatDateTime", () => {
  test("uses the platform timezone and locale", () => {
    expect(formatDateTime("2026-01-01T00:00:00Z", "en-US")).toBe("1/1/26, 7:00 AM")
  })

  test("returns a stable placeholder for absent or invalid timestamps", () => {
    expect(formatDateTime(undefined)).toBe("—")
    expect(formatDateTime("not-a-date")).toBe("—")
  })
})
