import { describe, expect, test } from "bun:test"
import { SUBMISSION_STATUSES, submissionsListDefinition } from "../src/features/submissions/list-query"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { ReportSubmissionTaskForm } from "../src/features/task-forms/report-submission-task-form"

describe("statistical submissions", () => {
  test("keeps workflow status filters aligned with the list API", () => {
    expect(SUBMISSION_STATUSES).toEqual(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"])
    expect(submissionsListDefinition.queryConfig.filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ urlKey: "status", apiKey: "status", mode: "multi" }),
    ]))
  })

  test("renders the report submission dossier shell", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ReportSubmissionTaskForm
          task={{ id: "task-1", caseId: "case-1", caseCode: "RPT-1", caseType: "STAT_REPORT_SUBMISSION", title: "Monthly report", stepCode: "checker_review", status: "READY", updatedAt: "2026-01-01" }}
          mode="view"
          data={{}}
          onSubmit={() => undefined}
          onReturn={() => undefined}
        />
      </I18nProvider>
    )
    expect(html).toContain("statistical.task_form.loading")
    expect(html).toContain("statistical.task_form.view_only")
  })
})
