import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { taskForms } from "../src/taskForms"
import { CfcTaskForm } from "../src/features/contracts/task-forms/cfc-task-form"

describe("capital task forms", () => {
  test("resolves maker and checker forms for each supported contract action", () => {
    for (const key of [
      "cfc_contract_v1.maker_input",
      "cfc_contract_v1.checker_review",
      "cfc_amendment_v1.maker_input",
      "cfc_amendment_v1.checker_review",
      "cfc_movement_v1.maker_input",
      "cfc_movement_v1.checker_review",
    ]) {
      expect(taskForms[key]).toBeFunction()
    }
    expect(taskForms["cfc_contract_v1.maker_input"]).toBe(
      taskForms["cfc_contract_v1.checker_review"]
    )
  })

  test("renders the contract task form in read-only mode", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <CfcTaskForm
          task={{ id: "task-1", caseId: "case-1", caseCode: "CF-1", caseType: "CFC_CONTRACT_V1", title: "Contract", stepCode: "checker_review", status: "READY", updatedAt: "2026-01-01" }}
          mode="view"
          data={{}}
          onSubmit={() => undefined}
          onReturn={() => undefined}
        />
      </I18nProvider>
    )
    expect(html).toContain("capital.task_form.loading")
    expect(html).toContain("capital.task_form.view_only")
  })
})
