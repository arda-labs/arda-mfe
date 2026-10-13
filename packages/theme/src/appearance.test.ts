import { describe, expect, test } from "bun:test"
import { defaultAppearance, migrateLegacyAppearance } from "./appearance"

describe("migrateLegacyAppearance", () => {
  test("old defaults move to the new defaults", () => {
    const migrated = migrateLegacyAppearance({
      baseColor: "arda",
      chartPalette: "default",
      font: "inter",
      headingFont: "inter",
      radius: "md",
      headerSurface: "background",
      sidebarSurface: "sidebar",
    })
    expect(migrated).toEqual(defaultAppearance)
  })

  test("explicit choices are kept", () => {
    const migrated = migrateLegacyAppearance({
      baseColor: "green",
      font: "mono",
      headingFont: "serif",
      radius: "lg",
      headerSurface: "muted",
    })
    expect(migrated.baseColor).toBe("green")
    expect(migrated.font).toBe("mono")
    expect(migrated.headingFont).toBe("serif")
    expect(migrated.radius).toBe("lg")
    expect(migrated.headerSurface).toBe("muted")
  })

  test("unknown values fall back to defaults", () => {
    const migrated = migrateLegacyAppearance({
      font: "comic" as never,
      baseColor: "teal" as never,
    })
    expect(migrated.font).toBe(defaultAppearance.font)
    expect(migrated.baseColor).toBe(defaultAppearance.baseColor)
  })
})
