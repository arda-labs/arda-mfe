import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormProps, TaskFormRegistry } from "@workspace/workflow-task"
import { DpmSavingsTaskForm } from "@/features/savings/task-forms/dpm-savings-task-form"
import { DpmProductRequestTaskForm } from "@/features/products/task-forms/dpm-product-request-task-form"
import { DpmRateRequestTaskForm } from "@/features/rates/task-forms/dpm-rate-request-task-form"
import { DpmBatchInterestTaskForm } from "@/features/batch-interest/task-forms/dpm-batch-interest-task-form"

/**
 * Module Federation `./taskForms` entry for the deposit remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). Keys are
 * added here when a step gets its own task form — never guessed by the host.
 *
 * All DPM savings flows (additional / settle / pay interest / capitalize)
 * share one component; the variant only changes the labels shown.
 */
export const locales = createAppLocaleLoader("deposit", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

const AdditionalForm = (props: TaskFormProps) => (
  <DpmSavingsTaskForm {...props} variant="additional" />
)
const SettleForm = (props: TaskFormProps) => (
  <DpmSavingsTaskForm {...props} variant="settle" />
)
const InterestForm = (props: TaskFormProps) => (
  <DpmSavingsTaskForm {...props} variant="interest" />
)

export const taskForms: TaskFormRegistry = {
  "dpm_additional_v1.maker_input": AdditionalForm,
  "dpm_additional_v1.checker_review": AdditionalForm,
  "dpm_settle_v2.maker_input": SettleForm,
  "dpm_settle_v2.checker_review": SettleForm,
  "dpm_pay_interest_v1.maker_input": InterestForm,
  "dpm_pay_interest_v1.checker_review": InterestForm,
  "dpm_capitalize_v1.maker_input": InterestForm,
  "dpm_capitalize_v1.checker_review": InterestForm,
  "dpm_product_register_v1.maker_input": DpmProductRequestTaskForm,
  "dpm_product_register_v1.checker_review": DpmProductRequestTaskForm,
  "dpm_product_edit_v1.maker_input": DpmProductRequestTaskForm,
  "dpm_product_edit_v1.checker_review": DpmProductRequestTaskForm,
  "dpm_rate_register_v1.maker_input": DpmRateRequestTaskForm,
  "dpm_rate_register_v1.checker_review": DpmRateRequestTaskForm,
  "dpm_rate_edit_v1.maker_input": DpmRateRequestTaskForm,
  "dpm_rate_edit_v1.checker_review": DpmRateRequestTaskForm,
  "dpm_batch_interest_v1.maker_input": DpmBatchInterestTaskForm,
  "dpm_batch_interest_v1.checker_review": DpmBatchInterestTaskForm,
}

export default taskForms
