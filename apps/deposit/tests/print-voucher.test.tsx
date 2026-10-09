import { afterEach, describe, expect, test } from "bun:test"
import { printVoucher } from "../src/lib/print-voucher"

describe("deposit voucher printing", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window")
  })

  test("writes an escaped transaction voucher and opens print", () => {
    let printed = false
    let html = ""
    const win = {
      document: {
        write: (value: string) => { html = value },
        close: () => undefined,
      },
      focus: () => undefined,
      print: () => { printed = true },
    }
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { open: () => win, setTimeout: (callback: () => void) => callback() },
    })

    expect(printVoucher({ title: "Receipt <1>", fields: [{ label: "Amount", value: "100" }] })).toBe(true)
    expect(html).toContain("Receipt &lt;1&gt;")
    expect(html).toContain("<span class=\"value\">100</span>")
    expect(printed).toBe(true)
  })

  test("reports a blocked popup", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { open: () => null },
    })
    expect(printVoucher({ title: "Receipt", fields: [] })).toBe(false)
  })

})
