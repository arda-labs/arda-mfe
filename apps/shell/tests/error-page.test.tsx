import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { ErrorPage } from "../src/features/errors/page"

describe("shell error pages", () => {
  test("renders the requested not-found experience", () => {
    const html = renderToStaticMarkup(
      <I18nProvider><ErrorPage code="404" /></I18nProvider>
    )
    expect(html).toContain("404")
    expect(html).toContain("Quay lại")
  })
})
