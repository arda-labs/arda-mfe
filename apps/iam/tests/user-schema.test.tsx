import { describe, expect, test } from "bun:test"
import { createUserSchema } from "../src/features/users/schema"

describe("IAM create-user form", () => {
  test("trims identity fields and rejects missing tenant scope", () => {
    const result = createUserSchema.safeParse({
      username: "  operator  ", email: " operator@example.test ", password: "secret123",
      tenantId: "  ",
    })

    expect(result.success).toBe(false)
    expect(createUserSchema.parse({
      username: "  operator  ", email: " operator@example.test ", password: "secret123",
      tenantId: " tenant-1 ",
    })).toMatchObject({ username: "operator", email: "operator@example.test", tenantId: "tenant-1" })
  })

})
