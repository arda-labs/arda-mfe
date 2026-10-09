import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { StatusBadge } from "../../packages/ui/src/components/status-badge"

describe("StatusBadge", () => {
  test("renders the caller label while preserving an explicit tone", () => {
    const markup = renderToStaticMarkup(
      <StatusBadge status="APPROVED" label="Approved" variant="success" />
    )
    expect(markup).toContain("Approved")
    expect(markup).toContain("bg-success/10")
  })

  test("uses the common neutral style for an unknown status", () => {
    const markup = renderToStaticMarkup(<StatusBadge status="WAITING" />)
    expect(markup).toContain("WAITING")
    expect(markup).toContain("text-foreground")
  })
})
