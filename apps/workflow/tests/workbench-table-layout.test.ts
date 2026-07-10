import { describe, expect, test } from "bun:test"
import { transactionListTableLayout } from "../src/features/workbench/workbench-table-layout"

describe("transactionListTableLayout", () => {
  test("keeps the incoming and outgoing pagination footer outside the scroll area", () => {
    expect(transactionListTableLayout).toEqual({
      layout: "panel",
      className: "min-h-0 flex-1",
    })
  })
})
