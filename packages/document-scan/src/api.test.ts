import { describe, expect, test } from "bun:test"
import { classifyExtractError } from "./api"

describe("classifyExtractError", () => {
  test("maps problem codes and statuses", () => {
    expect(classifyExtractError({ status: 422, code: "document.extract.not_a_document" })).toBe("not_document")
    expect(classifyExtractError({ status: 413, code: "validation.body_too_large" })).toBe("too_large")
    expect(classifyExtractError({ status: 415, code: "document.extract.unsupported_media_type" })).toBe("unsupported")
    expect(classifyExtractError({ status: 504, code: "document.extract.model_timeout" })).toBe("timeout")
    expect(classifyExtractError({ status: 502, code: "upstream_error" })).toBe("timeout")
    expect(classifyExtractError({ status: 502, code: "document.extract.model_bad_output" })).toBe("bad_output")
    expect(classifyExtractError({ status: 503, code: "document.extract.model_unavailable" })).toBe("unavailable")
    expect(classifyExtractError({ status: 403, code: "forbidden" })).toBe("forbidden")
    expect(classifyExtractError({ status: 403, code: "recent_auth_required" })).toBe("unknown")
    expect(classifyExtractError(new Error("boom"))).toBe("unknown")
  })
})
