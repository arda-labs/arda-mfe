import { describe, expect, test } from "bun:test"
import { toMediaApiPath } from "@workspace/media"

/**
 * Production resolves `apiUrl()` to the API origin, so blob fetches receive
 * absolute URLs. The normalizer must strip the origin instead of wrapping the
 * whole URL as a public id (which produced
 * `/api/media/https%3A%2F%2Fapi.../preview` and 404s).
 */
describe("media api path normalization", () => {
  test("keeps relative API paths", () => {
    expect(toMediaApiPath("/api/media/mf_1")).toBe("/api/media/mf_1")
    expect(toMediaApiPath("/api/media/mf_1/download")).toBe(
      "/api/media/mf_1/download"
    )
  })

  test("strips the API origin from absolute URLs", () => {
    expect(
      toMediaApiPath("https://api.arda.io.vn/api/media/mf_1/preview")
    ).toBe("/api/media/mf_1/preview")
    expect(
      toMediaApiPath("https://api.arda.io.vn/api/media/mf_1/download?x=1")
    ).toBe("/api/media/mf_1/download?x=1")
  })

  test("wraps bare public ids", () => {
    expect(toMediaApiPath("mf_1")).toBe("/api/media/mf_1")
    expect(toMediaApiPath("mf_1/preview")).toBe("/api/media/mf_1%2Fpreview")
  })

  test("rejects external URLs and empty input", () => {
    expect(() => toMediaApiPath("https://cdn.example.com/doc.pdf")).toThrow()
    expect(() => toMediaApiPath("   ")).toThrow()
  })
})
