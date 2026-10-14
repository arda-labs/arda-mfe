import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { ReviewStep } from "./review-step"
import { CCCD_FIELDS, type CccdExtractResult } from "./types"

const result: CccdExtractResult = {
  doc_type: "cccd",
  card_version: "cccd_chip_2021",
  fields: Object.fromEntries(
    CCCD_FIELDS.map((f) => [f, { value: f === "id_number" ? "82279855585" : "x", raw: "x", flags: f === "id_number" ? ["invalid_format"] : [] }])
  ) as CccdExtractResult["fields"],
  warnings: ["back_side_missing"],
  model: "m",
  model_location: "cloud",
}

describe("ReviewStep", () => {
  test("renders flags, warnings and a disabled apply button while an error is unresolved", () => {
    const html = renderToStaticMarkup(
      // DateField reads useI18n(), so a provider is required; ReviewStep still gets the identity `t`.
      <I18nProvider>
        <ReviewStep
          result={result}
          frontUrl="blob:front"
          existing={{ id_number: "001122334455" }}
          t={(k: string) => k}
          onBack={() => {}}
          onApply={() => {}}
        />
      </I18nProvider>
    )
    expect(html).toContain("document_scan.flags.invalid_format")
    expect(html).toContain("document_scan.warnings.back_side_missing")
    expect(html).toContain("document_scan.will_overwrite")
    expect(html).toMatch(/data-testid="document-scan-apply"[^>]*disabled/)
  })

  test("renders the apply error above the buttons", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ReviewStep
          result={result}
          frontUrl="blob:front"
          existing={{}}
          t={(k: string) => k}
          error="boom failed"
          onBack={() => {}}
          onApply={() => {}}
        />
      </I18nProvider>
    )
    expect(html).toMatch(/<p role="alert" class="[^"]*text-destructive[^"]*">boom failed<\/p>/)
    expect(html.indexOf("boom failed")).toBeLessThan(html.indexOf('data-testid="document-scan-apply"'))
  })

  test("badge colour follows each flag, not the worst flag of the field", () => {
    const mixed: CccdExtractResult = {
      ...result,
      fields: {
        ...result.fields,
        id_number: { value: "82279855585", raw: "x", flags: ["invalid_format", "not_found"] },
      },
    }
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ReviewStep result={mixed} frontUrl="blob:front" existing={{}} t={(k: string) => k} onBack={() => {}} onApply={() => {}} />
      </I18nProvider>
    )
    expect(html).toMatch(/text-destructive[^>]*>document_scan\.flags\.invalid_format/)
    expect(html).toMatch(/text-muted-foreground[^>]*>document_scan\.flags\.not_found/)
  })
})
