import { describe, expect, test } from "bun:test"
import { defaultPreferences, normalizePreferences } from "./appearance"
import {
  BRAND_PRESETS,
  DEFAULT_BRAND_COLOR,
  brandVars,
  contrastWithWhite,
  isUsableBrandColor,
  MIN_BRAND_CONTRAST,
  normalizeOrgTheme,
} from "./brand"

describe("normalizePreferences", () => {
  test("keeps known values", () => {
    expect(
      normalizePreferences({ density: "comfortable", fontScale: "lg" })
    ).toEqual({ density: "comfortable", fontScale: "lg" })
  })

  test("falls back for unknown or retired shapes", () => {
    expect(
      normalizePreferences({ baseColor: "green", font: "inter", density: "x" })
    ).toEqual(defaultPreferences)
    expect(normalizePreferences(null)).toEqual(defaultPreferences)
  })
})

describe("brand colour", () => {
  test("every preset keeps white text readable", () => {
    for (const preset of BRAND_PRESETS) {
      expect(contrastWithWhite(preset.color)).toBeGreaterThanOrEqual(
        MIN_BRAND_CONTRAST
      )
    }
  })

  test("Arda blue is about 5.7:1", () => {
    expect(contrastWithWhite("#2459e8")).toBeCloseTo(5.72, 1)
  })

  test("light or malformed colours are rejected", () => {
    expect(isUsableBrandColor("#f59e0b")).toBe(false)
    expect(isUsableBrandColor("#ffffff")).toBe(false)
    expect(isUsableBrandColor("2459e8")).toBe(false)
    expect(isUsableBrandColor("red")).toBe(false)
  })

  test("normalizeOrgTheme falls back to the default colour and palette", () => {
    expect(
      normalizeOrgTheme({ brandColor: "#FDE047", chartPalette: "neon" })
    ).toEqual({ brandColor: DEFAULT_BRAND_COLOR, chartPalette: "default" })
    expect(
      normalizeOrgTheme({ brandColor: "#0B7F7A", chartPalette: "finance" })
    ).toEqual({ brandColor: "#0b7f7a", chartPalette: "finance" })
  })

  test("the default colour leaves globals.css in charge", () => {
    expect(brandVars(DEFAULT_BRAND_COLOR, "light")).toEqual({})
    expect(brandVars("#0b7f7a", "light")["--primary"]).toBe("#0b7f7a")
    expect(brandVars("#0b7f7a", "dark")["--primary"]).toContain("color-mix")
  })
})
