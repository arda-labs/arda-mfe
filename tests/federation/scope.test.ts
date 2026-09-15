import { afterEach, expect, test } from "bun:test"
import { getAuthScope, useAuthStore } from "../../packages/auth/src/store"
import { getScopedQueryClient } from "../../packages/query/src/provider"
import { createApiClient } from "../../packages/api/src/client"

afterEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }))
test("navigation reuses a remote cache; tenant, organization and logout discard it", () => {
  const a = { sub: "actor", name: "Actor", email: "actor@example.test", tenantId: "a", activeOrgId: "org-a" }
  useAuthStore.setState({ user: a, isAuthenticated: true })
  const client = getScopedQueryClient(getAuthScope(a))
  client.setQueryData(["users"], ["tenant-a-user"])
  expect(getScopedQueryClient(getAuthScope(a))).toBe(client)
  const b = { ...a, tenantId: "b" }
  useAuthStore.setState({ user: b })
  expect(client.getQueryData(["users"])).toBeUndefined()
  const next = getScopedQueryClient(getAuthScope(b))
  expect(next).not.toBe(client)
  next.setQueryData(["users"], ["tenant-b-user"])
  useAuthStore.setState({ user: { ...b, activeOrgId: "org-b" } })
  expect(next.getQueryData(["users"])).toBeUndefined()
  useAuthStore.setState({ user: null })
  expect(getScopedQueryClient(getAuthScope(a)).getQueryData(["users"])).toBeUndefined()
})
test("in-flight GET dedupe cannot reuse a previous tenant's response", async () => {
  const original = globalThis.fetch
  let scope = "tenant-a"
  const resolvers: ((response: Response) => void)[] = []
  globalThis.fetch = (() => new Promise<Response>((resolve) => resolvers.push(resolve))) as typeof fetch
  try {
    const api = createApiClient({ getSessionScope: () => scope })
    const first = api.get("/resource")
    const same = api.get("/resource")
    expect(same).toBe(first)
    scope = "tenant-b"
    const second = api.get("/resource")
    expect(resolvers).toHaveLength(2)
    resolvers[0](Response.json({ tenant: "a" }))
    resolvers[1](Response.json({ tenant: "b" }))
    expect(await second).toEqual({ tenant: "b" })
    expect(await first).toEqual({ tenant: "a" })
  } finally { globalThis.fetch = original }
})
