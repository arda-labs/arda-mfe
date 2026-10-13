import { describe, expect, test } from "bun:test"
import {
  dateTextToIso,
  dateToIso,
  isoToDate,
  isoToDateText,
  maskDateText,
} from "./date-text"

describe("date text", () => {
  test("ISO <-> dd/MM/yyyy", () => {
    expect(isoToDateText("2026-10-13")).toBe("13/10/2026")
    expect(dateTextToIso("13/10/2026")).toBe("2026-10-13")
    expect(isoToDateText("")).toBe("")
    expect(isoToDateText("2026-10-13T08:00:00Z")).toBe("")
  })

  test("rejects impossible or partial dates", () => {
    expect(dateTextToIso("31/02/2026")).toBeNull()
    expect(dateTextToIso("29/02/2027")).toBeNull()
    expect(dateTextToIso("29/02/2028")).toBe("2028-02-29")
    expect(dateTextToIso("13/10/26")).toBeNull()
    expect(dateTextToIso("13/13/2026")).toBeNull()
  })

  test("mask inserts slashes and accepts pasted ISO", () => {
    expect(maskDateText("1")).toBe("1")
    expect(maskDateText("131")).toBe("13/1")
    expect(maskDateText("13102026")).toBe("13/10/2026")
    expect(maskDateText("13/10/2026999")).toBe("13/10/2026")
    expect(maskDateText("2026-10-13")).toBe("13/10/2026")
  })

  test("local Date round trip has no timezone shift", () => {
    expect(dateToIso(isoToDate("2026-01-01")!)).toBe("2026-01-01")
    expect(isoToDate("bad")).toBeUndefined()
  })
})
