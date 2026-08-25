import { describe, expect, test } from "bun:test"
import { registrationStatusLabelKey } from "../src/features/customers/utils/registration-status"

describe("registrationStatusLabelKey", () => {
  test("labels submitted registrations as awaiting approval", () => {
    expect(registrationStatusLabelKey("SUBMITTED")).toBe(
      "crm.customers.registrations.status.awaiting_approval"
    )
  })
})
