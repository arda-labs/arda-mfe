import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { ProfilePage } from "../src/features/settings/profile/page"

describe("account profile", () => {
  test("renders profile controls and the public profile link", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ProfilePage />
      </I18nProvider>
    )

    expect(html).toContain("Open public profile")
    expect(html).toContain("href=\"/in/me\"")
    expect(html).toContain("Change")
  })
})
