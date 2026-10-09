import { describe, expect, test } from "bun:test"
import { toRegistrationPayload } from "../src/features/shared/ui"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { EmployeeRegistrationTaskForm } from "../src/features/task-forms/employee-registration-task-form"

describe("HRM registration payload", () => {
  test("trims scalar fields and removes empty nested rows", () => {
    const payload = toRegistrationPayload({
      employee_code: " E-1 ", employee_type: "OFFICIAL", avatar_file_id: " ",
      org_unit_id: "org-1", full_name: " Nguyen Van A ", date_of_birth: "",
      gender: "", mobile: "", email: "", marital_status: "", address: " 1 Main ",
      permanent_address: " ", identity_no: " 123 ", identity_issue_date: "",
      identity_expiry_date: "", identity_issue_place: "", start_date: "", official_date: "",
      assignments: [{ title: "", active: false }, { title: "Director", active: true }],
      educations: [], family_members: [], delegations: [], attachments: [],
    })

    expect(payload.employee_code).toBe("E-1")
    expect(payload.full_name).toBe("Nguyen Van A")
    expect(payload.assignments).toEqual([{ title: "Director", active: true }])
  })

  test("renders the registration task context and decision controls", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <EmployeeRegistrationTaskForm
          task={{ id: "task-1", caseId: "case-1", caseCode: "HR-1", caseType: "HRM_EMPLOYEE_REGISTRATION", title: "Employee", stepCode: "maker_input", status: "READY", updatedAt: "2026-01-01" }}
          mode="view"
          data={{}}
          onSubmit={() => undefined}
          onReturn={() => undefined}
        />
      </I18nProvider>
    )
    expect(html).toContain("hrm.task_form.loading")
    expect(html).toContain("hrm.task_form.view_only")
  })
})
