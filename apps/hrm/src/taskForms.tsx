import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormRegistry } from "@workspace/workflow-task"
import { EmployeeRegistrationTaskForm } from "@/features/task-forms/employee-registration-task-form"

/**
 * Module Federation `./taskForms` entry for the hrm remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). The HRM
 * registration flow uses the `checker_review` / `maker_revise` step codes.
 */
export const locales = createAppLocaleLoader("hrm", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

export const taskForms: TaskFormRegistry = {
  "hrm_employee_registration.checker_review": EmployeeRegistrationTaskForm,
  "hrm_employee_registration.maker_revise": EmployeeRegistrationTaskForm,
}

export default taskForms
