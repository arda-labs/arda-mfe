import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormRegistry } from "@workspace/workflow-task"
import { ReportSubmissionTaskForm } from "@/features/task-forms/report-submission-task-form"

/**
 * Module Federation `./taskForms` entry for the statistical remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased).
 */
export const locales = createAppLocaleLoader("statistical", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

export const taskForms: TaskFormRegistry = {
  "rpt_submit_v2.maker_input": ReportSubmissionTaskForm,
  "rpt_submit_v2.checker_review": ReportSubmissionTaskForm,
}

export default taskForms
