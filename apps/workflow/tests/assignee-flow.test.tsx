import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { AssigneeFlow } from "../src/features/workbench/utils/workbench-columns"

describe("AssigneeFlow", () => {
  test("shows people without exposing an internal candidate role", () => {
    const markup = renderToStaticMarkup(
      <AssigneeFlow
        item={{
          previousAssignedTo: "maker@example.com",
          previousAssignedToName: "Nguyen Van A",
          assignedTo: "checker@example.com",
          assignedToName: "Tran Thi B",
          candidateRole: "CUSTOMER_CHECKER",
        }}
      />
    )

    expect(markup).toContain("Nguyen Van A")
    expect(markup).toContain("Tran Thi B")
    expect(markup).not.toContain("CUSTOMER_CHECKER")
  })
})
