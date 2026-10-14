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
})
