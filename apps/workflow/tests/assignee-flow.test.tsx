import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { AssigneeFlow } from "../src/features/workbench/utils/workbench-columns"

describe("AssigneeFlow", () => {
  test("shows people without exposing an internal candidate role", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <AssigneeFlow
          item={{
            previousAssignedTo: "maker@example.com",
            previousAssignedToName: "Nguyen Van A",
            assignedTo: "checker@example.com",
            assignedToName: "Tran Thi B",
            candidateRole: "CUSTOMER_CHECKER",
          }}
        />
      </I18nProvider>
    )

    expect(markup).toContain("Nguyen Van A")
    expect(markup).toContain("Tran Thi B")
    expect(markup).not.toContain("CUSTOMER_CHECKER")
  })
})
