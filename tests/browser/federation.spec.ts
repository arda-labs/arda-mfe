import { expect, test, type Page } from "@playwright/test"

// Frozen BFF session for the packaged shell: identity, empty menu (the sidebar
// then falls back to its static route table) and an inbox that never streams.
const session = {
  sub: "browser-test-user",
  username: "browser-test",
  name: "Browser Test",
  email: "browser-test@example.test",
  roles: ["SUPER_ADMIN"],
  permissions: ["superadmin"],
  globalRoles: ["SUPER_ADMIN"],
  isGlobalAdmin: true,
  tenantId: "tenant-browser",
  activeTenantId: "tenant-browser",
  orgIds: ["org-browser"],
  activeOrgId: "org-browser",
}

async function mockBackend(page: Page) {
  // Vietnamese is the product default; forcing it also exercises the per-app
  // lazy locale chunk added for first-load performance.
  await page.addInitScript(() => localStorage.setItem("arda-locale", "vi-VN"))
  // Empty paginated envelope: the list pages under test only need a shape, and
  // lookups that expect arrays are not exercised on these routes.
  const emptyList = { items: [], page: 1, per_page: 20, total: 0 }
  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (pathname === "/api/auth/me") return route.fulfill({ json: { success: true, result: session } })
    if (pathname === "/api/notifications/stream") return route.fulfill({ status: 204, body: "" })
    if (pathname.endsWith("/unread-count")) return route.fulfill({ json: { success: true, result: { count: 0 } } })
    if (pathname === "/api/notifications") {
      return route.fulfill({ json: { success: true, result: { notifications: [] } } })
    }
    return route.fulfill({
      json: { success: true, result: request.method() === "GET" ? emptyList : null },
    })
  })
}

function trackRemoteEntries(page: Page) {
  const loaded: string[] = []
  page.on("request", (request) => {
    const match = /\/mfes\/([a-z]+)\/remoteEntry\.js/.exec(request.url())
    if (match) loaded.push(match[1])
  })
  return loaded
}

test("a deep link renders the owning remote without an error boundary", async ({ page }) => {
  await mockBackend(page)
  const remotes = trackRemoteEntries(page)

  await page.goto("/admin/users")

  await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
  expect(remotes).toEqual(["iam"])
})

test("IAM keeps its admin routes instead of falling through to platform", async ({ page }) => {
  await mockBackend(page)
  const remotes = trackRemoteEntries(page)

  await page.goto("/admin/resource-routes")

  await expect(page.getByRole("heading", { name: "Tài nguyên & policy" })).toBeVisible()
  expect(remotes).toContain("iam")
  expect(remotes).not.toContain("platform")
})

test("platform deep links still resolve to the platform remote", async ({ page }) => {
  await mockBackend(page)
  const remotes = trackRemoteEntries(page)

  await page.goto("/admin/organizations")

  await expect(page.getByRole("heading", { name: "Đơn vị & Tổ chức" })).toBeVisible()
  expect(remotes).toEqual(["platform"])
})

test("an unknown admin path renders the shell 404 instead of a remote default page", async ({ page }) => {
  await mockBackend(page)
  const remotes = trackRemoteEntries(page)

  await page.goto("/admin/not-a-real-route")

  await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
  expect(remotes).toEqual([])
})
