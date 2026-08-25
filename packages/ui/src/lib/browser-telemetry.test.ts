import { afterEach, describe, expect, test } from "bun:test"
import {
  reportBrowserError,
  setBrowserTelemetryListener,
  type BrowserErrorReport,
} from "./browser-telemetry"

afterEach(() => setBrowserTelemetryListener(null))

describe("browser telemetry", () => {
  test("redacts identifiers and bounds the report before delivery", () => {
    let received: BrowserErrorReport | null = null
    setBrowserTelemetryListener((report) => {
      received = report
    })

    reportBrowserError({
      kind: "browser-runtime",
      error: new Error("failed for user@example.com id 123e4567-e89b-12d3-a456-426614174000 token=secret"),
      route: "/admin?token=secret",
    })

    expect(received).not.toBeNull()
    expect(received?.message).toContain("[redacted-email]")
    expect(received?.message).toContain("[redacted-id]")
    expect(received?.message).toContain("token=[redacted]")
    expect(received?.route).toBe("/admin?token=[redacted]")
  })
})
