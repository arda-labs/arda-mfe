import { describe, expect, test } from "bun:test"
import {
  blockingFields,
  computeOverwrites,
  fieldSeverity,
  flagSeverity,
  initialValues,
} from "./review"
import { CCCD_FIELDS, type CccdExtractResult, type CccdFieldName } from "./types"

function result(overrides: Partial<Record<CccdFieldName, { value: string | null; flags: string[] }>>): CccdExtractResult {
  const fields = Object.fromEntries(
    CCCD_FIELDS.map((name) => {
      const o = overrides[name] ?? { value: "x", flags: [] }
      return [name, { value: o.value, raw: o.value, flags: o.flags }]
    })
  ) as CccdExtractResult["fields"]
  return { doc_type: "cccd", card_version: "cccd_chip_2021", fields, warnings: [], model: "m", model_location: "cloud" }
}

describe("severity", () => {
  test("maps known flags and defaults unknown ones to warning", () => {
    expect(flagSeverity("mismatch_id_number")).toBe("error")
    expect(flagSeverity("expired")).toBe("warning")
    expect(flagSeverity("not_found")).toBe("info")
    expect(flagSeverity("brand_new_flag")).toBe("warning")
  })
  test("field severity is the worst flag", () => {
    expect(fieldSeverity([])).toBeNull()
    expect(fieldSeverity(["not_found"])).toBe("info")
    expect(fieldSeverity(["expired", "date_order"])).toBe("error")
  })
})

describe("review rules", () => {
  test("initial values use empty string for null", () => {
    const v = initialValues(result({ residence: { value: null, flags: ["not_found"] } }))
    expect(v.residence).toBe("")
    expect(v.id_number).toBe("x")
  })

  test("error fields block until edited or kept", () => {
    const r = result({ id_number: { value: "82279855585", flags: ["invalid_format"] }, expiry_date: { value: "2020-01-01", flags: ["expired"] } })
    const values = initialValues(r)
    expect(blockingFields(r, values, new Set())).toEqual(["id_number"])
    expect(blockingFields(r, { ...values, id_number: "082279855585" }, new Set())).toEqual([])
    expect(blockingFields(r, values, new Set<CccdFieldName>(["id_number"]))).toEqual([])
  })

  test("overwrites are fields whose existing form value differs and is non-empty", () => {
    const values = { ...initialValues(result({})), id_number: "082279855585", full_name: "HOÀNG THÙY HUYỀN" }
    expect(computeOverwrites(values, { id_number: "001122334455", full_name: "HOÀNG THÙY HUYỀN", residence: "" })).toEqual(["id_number"])
  })
})
