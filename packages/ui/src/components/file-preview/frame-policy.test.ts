import { describe, expect, it } from "bun:test"
import { canFrameSource } from "./frame-policy"

const ORIGIN = "https://arda.io.vn"

describe("canFrameSource", () => {
  it("allows blob: URLs", () => {
    expect(canFrameSource("blob:https://arda.io.vn/3f2a-uuid", ORIGIN)).toBe(true)
  })

  it("allows same-origin absolute and relative URLs", () => {
    expect(canFrameSource("https://arda.io.vn/files/a.pdf", ORIGIN)).toBe(true)
    expect(canFrameSource("/api/media/abc", ORIGIN)).toBe(true)
    expect(canFrameSource("files/a.pdf", ORIGIN)).toBe(true)
  })

  it("denies other origins, including subdomains and other ports", () => {
    expect(canFrameSource("https://evil.example/a.pdf", ORIGIN)).toBe(false)
    expect(canFrameSource("https://api.arda.io.vn/api/media/abc", ORIGIN)).toBe(false)
    expect(canFrameSource("https://arda.io.vn:8443/a.pdf", ORIGIN)).toBe(false)
    expect(canFrameSource("http://arda.io.vn/a.pdf", ORIGIN)).toBe(false)
    expect(canFrameSource("//evil.example/a.pdf", ORIGIN)).toBe(false)
  })

  it("denies script-bearing and opaque schemes", () => {
    expect(canFrameSource("javascript:alert(1)", ORIGIN)).toBe(false)
    expect(canFrameSource("JavaScript:alert(1)", ORIGIN)).toBe(false)
    expect(canFrameSource("data:text/html,<script>alert(1)</script>", ORIGIN)).toBe(false)
    expect(canFrameSource("file:///etc/passwd", ORIGIN)).toBe(false)
    expect(canFrameSource("about:blank", ORIGIN)).toBe(false)
  })

  it("denies empty and malformed input", () => {
    expect(canFrameSource("", ORIGIN)).toBe(false)
    expect(canFrameSource("http://", ORIGIN)).toBe(false)
    expect(canFrameSource("https://arda.io.vn/a.pdf", "not an origin")).toBe(false)
  })
})
