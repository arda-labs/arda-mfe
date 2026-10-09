import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { DescriptionList } from "../../packages/ui/src/components/description-list"
import { DetailFooterBar } from "../../packages/ui/src/components/detail-footer-bar"
import { DetailPageShell } from "../../packages/ui/src/components/detail-page-shell"
import { DetailSection } from "../../packages/ui/src/components/detail-section"

describe("DescriptionList", () => {
  test("shows a dash for empty values and keeps labels", () => {
    const markup = renderToStaticMarkup(
      <DescriptionList
        items={[
          { label: "Email", value: "a@b.vn" },
          { label: "Position", value: "" },
          { label: "Address", value: undefined, wide: true },
        ]}
      />
    )
    expect(markup).toContain("a@b.vn")
    expect(markup).toContain("Position")
    expect(markup.match(/—/g)?.length).toBe(2)
    expect(markup).toContain("lg:col-span-full")
  })
})

describe("DetailSection", () => {
  test("labels the region by its title", () => {
    const markup = renderToStaticMarkup(
      <DetailSection id="profile" title="Profile">
        body
      </DetailSection>
    )
    expect(markup).toContain('id="profile"')
    expect(markup).toContain('aria-labelledby="profile-title"')
    expect(markup).toContain('id="profile-title"')
  })
})

describe("DetailFooterBar", () => {
  test("only announces unsaved changes when dirty", () => {
    const clean = renderToStaticMarkup(
      <DetailFooterBar dirtyLabel="Unsaved">x</DetailFooterBar>
    )
    const dirty = renderToStaticMarkup(
      <DetailFooterBar dirty dirtyLabel="Unsaved">
        x
      </DetailFooterBar>
    )
    expect(clean).not.toContain("Unsaved")
    expect(dirty).toContain("Unsaved")
  })
})

describe("DetailPageShell", () => {
  test("renders title, section navigation and footer", () => {
    const markup = renderToStaticMarkup(
      <DetailPageShell
        title="alice"
        sections={[
          { id: "account", label: "Account" },
          { id: "profile", label: "Profile" },
        ]}
        sectionNavLabel="Sections"
        footer={<div>footer-actions</div>}
      >
        content
      </DetailPageShell>
    )
    expect(markup).toContain("alice")
    expect(markup).toContain('href="#profile"')
    expect(markup).toContain('aria-label="Sections"')
    expect(markup).toContain("footer-actions")
  })

  test("omits the section nav when there are no sections", () => {
    const markup = renderToStaticMarkup(
      <DetailPageShell title="alice">content</DetailPageShell>
    )
    expect(markup).not.toContain("<nav")
  })
})
