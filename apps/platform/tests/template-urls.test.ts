import { describe, expect, test } from "bun:test"
import {
  resolveTemplateDownloadUrl,
  resolveTemplateFileUrl,
  templateFileName,
  templatePublicId,
  toTemplateFilePath,
} from "../src/features/templates/urls"

/**
 * Locks the URL contract for template attachments. Production held a bare
 * `/api/media/<public_id>` path (uploads from preview deployments), which the
 * browser resolved against the web origin and the BFF rejected with
 * `not_authenticated`; every entry point must resolve through the API origin.
 */
describe("template file path normalization", () => {
  test("keeps media API paths", () => {
    expect(toTemplateFilePath("/api/media/mf_de61")).toBe("/api/media/mf_de61")
    expect(toTemplateFilePath("/api/media/public/mf_de61")).toBe(
      "/api/media/public/mf_de61"
    )
  })

  test("strips our deployment origins", () => {
    expect(toTemplateFilePath("https://api.arda.io.vn/api/media/mf_de61")).toBe(
      "/api/media/mf_de61"
    )
    expect(toTemplateFilePath("https://arda.io.vn/api/media/mf_de61")).toBe(
      "/api/media/mf_de61"
    )
  })

  test("keeps external documents untouched", () => {
    expect(
      toTemplateFilePath("https://cdn.example.com/docs/contract.pdf")
    ).toBe("https://cdn.example.com/docs/contract.pdf")
  })

  test("handles empty values", () => {
    expect(toTemplateFilePath("   ")).toBe("")
  })
})

describe("template file URL resolution", () => {
  test("resolves media paths through the shared API resolver", () => {
    // Without a configured override (test env) apiUrl keeps the relative path.
    expect(resolveTemplateFileUrl("/api/media/mf_de61")).toBe(
      "/api/media/mf_de61"
    )
  })

  test("normalizes web-origin URLs back to the API path", () => {
    expect(resolveTemplateFileUrl("https://arda.io.vn/api/media/mf_de61")).toBe(
      "/api/media/mf_de61"
    )
  })

  test("keeps external absolute URLs", () => {
    expect(resolveTemplateFileUrl("https://cdn.example.com/doc.pdf")).toBe(
      "https://cdn.example.com/doc.pdf"
    )
  })
})

describe("template download URL resolution", () => {
  test("appends the media download action once", () => {
    expect(resolveTemplateDownloadUrl("/api/media/mf_de61")).toBe(
      "/api/media/mf_de61/download"
    )
    expect(resolveTemplateDownloadUrl("/api/media/mf_de61/download")).toBe(
      "/api/media/mf_de61/download"
    )
  })

  test("does not invent a download action for external documents", () => {
    expect(resolveTemplateDownloadUrl("https://cdn.example.com/doc.pdf")).toBe(
      "https://cdn.example.com/doc.pdf"
    )
  })
})

describe("template file name", () => {
  test("prefers the original filename from media metadata", () => {
    expect(
      templateFileName(
        {
          code: "CONTRACT",
          name: "Hợp đồng",
          file_type: "pdf",
          file_url: "/api/media/mf_de61",
        },
        { original_filename: "Hop dong 2026.pdf" }
      )
    ).toBe("Hop dong 2026.pdf")
  })
  test("uses the extension kept in the URL", () => {
    expect(
      templateFileName({
        code: "CONTRACT",
        name: "Hợp đồng",
        file_type: "pdf",
        file_url: "/api/media/contract.pdf",
      })
    ).toBe("contract.pdf")
  })

  test("decodes percent-encoded file names", () => {
    expect(
      templateFileName({
        code: "CONTRACT",
        name: "Hợp đồng",
        file_type: "pdf",
        file_url: "https://cdn.example.com/H%E1%BB%A3p%20%C4%91%E1%BB%93ng.pdf",
      })
    ).toBe("Hợp đồng.pdf")
  })

  test("falls back to code + file type for opaque media ids", () => {
    expect(
      templateFileName({
        code: "HOANTEST_01",
        name: "Hoan test",
        file_type: "pdf",
        file_url: "/api/media/mf_de61519fa168fee2da827af429c6818a",
      })
    ).toBe("HOANTEST_01.pdf")
  })
})

describe("template public id", () => {
  test("extracts the media public id from stored references", () => {
    expect(templatePublicId("/api/media/mf_de61")).toBe("mf_de61")
    expect(
      templatePublicId("https://api.arda.io.vn/api/media/mf_de61/download")
    ).toBe("mf_de61")
  })

  test("returns empty for external files", () => {
    expect(templatePublicId("https://cdn.example.com/contract.pdf")).toBe("")
    expect(templatePublicId("")).toBe("")
  })
})
