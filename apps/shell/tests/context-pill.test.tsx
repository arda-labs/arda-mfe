import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { ContextPill, type ContextPillProps } from "@workspace/ui/components/context-pill"

function render(props: Partial<ContextPillProps>) {
  return renderToStaticMarkup(
    <I18nProvider>
      <ContextPill unit="Hội sở" today="2026-10-13" {...props} />
    </I18nProvider>
  )
}

describe("ContextPill", () => {
  test("open day on today's date: unit and date, no warning", () => {
    const html = render({ businessDate: "2026-10-13T00:00:00Z", status: "OPEN" })
    expect(html).toContain("Hội sở")
    expect(html).toContain("13/10/2026")
    expect(html).not.toContain("data-warn")
  })

  test("business date behind the calendar turns amber and says so", () => {
    const html = render({ businessDate: "2026-10-12", status: "OPEN" })
    expect(html).toContain('data-warn="true"')
    expect(html).toContain("12/10/2026")
    expect(html).toContain("≠ 13/10")
  })

  test("EOD in progress is flagged", () => {
    const html = render({ businessDate: "2026-10-13", status: "EOD_PROCESSING" })
    expect(html).toContain('data-warn="true"')
    expect(html).toContain("EOD")
  })

  test("rail mode shows the short date only", () => {
    const html = render({ businessDate: "2026-10-13", status: "OPEN", compact: true })
    expect(html).toContain("13/10<")
    expect(html).not.toContain(">Hội sở<")
  })
})
