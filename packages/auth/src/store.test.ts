import { describe, expect, test } from "bun:test"
import { hasAnyPermission, hasPermission, normalizeAuthUser } from "./store"

describe("normalizeAuthUser", () => {
  test("composes display name and applies defaults", () => {
    const user = normalizeAuthUser({
      subject: "sub-123",
      firstName: "Lan",
      lastName: "Nguyen",
      email: "lan@example.com",
      tenantId: "tenant-1",
    })

    expect(user.sub).toBe("sub-123")
    expect(user.displayName).toBe("Lan Nguyen")
    expect(user.name).toBe("Lan Nguyen")
    expect(user.email).toBe("lan@example.com")
    expect(user.userId).toBe("")
    expect(user.tenantId).toBe("tenant-1")
    expect(user.activeTenantId).toBe("tenant-1")
    expect(user.tenantMemberships).toEqual([])
    expect(Array.isArray(user.roles)).toBe(true)
    expect(Array.isArray(user.permissions)).toBe(true)
    expect(Array.isArray(user.orgIds)).toBe(true)
  })

  test("falls back through subject -> userId for sub and prefers explicit displayName", () => {
    const fromUserId = normalizeAuthUser({ userId: "u-9" })
    expect(fromUserId.sub).toBe("u-9")

    const explicit = normalizeAuthUser({
      sub: "s-1",
      firstName: "A",
      lastName: "B",
      displayName: "Custom Name",
    })
    expect(explicit.displayName).toBe("Custom Name")
  })

  test("resolves picture through the provided resolver using the trimmed avatarFileId", () => {
    const resolved = normalizeAuthUser(
      { sub: "s-2", avatarFileId: "  file-42  " },
      (id) => `/media/${id}`
    )
    expect(resolved.avatarFileId).toBe("file-42")
    expect(resolved.picture).toBe("/media/file-42")

    const unresolved = normalizeAuthUser({ sub: "s-3", picture: "/pic.png" })
    expect(unresolved.picture).toBe("/pic.png")
  })
})

describe("hasPermission", () => {
  test("is false without a user", () => {
    expect(hasPermission(null, "iam.users.read")).toBe(false)
    expect(hasPermission(undefined, "iam.users.read")).toBe(false)
  })

  test("honours global admin capability and SUPER_ADMIN role", () => {
    expect(
      hasPermission({ sub: "", name: "", isGlobalAdmin: true }, "any.code")
    ).toBe(true)
    expect(hasPermission({ sub: "", name: "", roles: ["SUPER_ADMIN"] }, "x.y"))
      .toBe(true)
  })

  test("honours the superadmin sentinel permission", () => {
    expect(
      hasPermission({ sub: "", name: "", permissions: ["superadmin"] }, "z.z")
    ).toBe(true)
    expect(hasPermission({ sub: "", name: "" }, "finance.tx.post")).toBe(false)
  })

  test("matches an exact permission code", () => {
    expect(
      hasPermission({ sub: "", name: "", permissions: ["crm.read"] }, "crm.read")
    ).toBe(true)
    expect(
      hasPermission({ sub: "", name: "", permissions: ["crm.read"] }, "crm.write")
    ).toBe(false)
  })
})

describe("hasAnyPermission", () => {
  test("empty requirement set allows access", () => {
    expect(hasAnyPermission(null, [])).toBe(true)
  })

  test("passes when at least one code matches", () => {
    const user = { sub: "", name: "", permissions: ["a.a", "b.b"] }
    expect(hasAnyPermission(user, ["c.c", "b.b"])).toBe(true)
    expect(hasAnyPermission(user, ["c.c"])).toBe(false)
  })
})