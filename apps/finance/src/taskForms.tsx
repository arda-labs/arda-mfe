import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormRegistry } from "@workspace/workflow-task"
import { FundTaskForm } from "@/features/finance/posting/task-forms/fund-task-form"

/**
 * Module Federation `./taskForms` entry for the finance remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). The fund
 * appropriation and utilization flows share one component — both stage a
 * PENDING journal entry the checker reads by case id.
 */
export const locales = createAppLocaleLoader("finance", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

export const taskForms: TaskFormRegistry = {
  "fin_fund_approp_v2.maker_input": FundTaskForm,
  "fin_fund_approp_v2.checker_review": FundTaskForm,
  "fin_fund_use_v2.maker_input": FundTaskForm,
  "fin_fund_use_v2.checker_review": FundTaskForm,
}

export default taskForms
