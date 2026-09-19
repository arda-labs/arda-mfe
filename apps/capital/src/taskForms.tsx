import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormProps, TaskFormRegistry } from "@workspace/workflow-task"
import { CfcTaskForm } from "@/features/contracts/task-forms/cfc-task-form"

/**
 * Module Federation `./taskForms` entry for the capital remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). CFM contract,
 * amendment and movement share one component; the variant only changes which
 * staged row is shown.
 */
export const locales = createAppLocaleLoader("capital", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

const ContractForm = (props: TaskFormProps) => (
  <CfcTaskForm {...props} variant="contract" />
)
const AmendmentForm = (props: TaskFormProps) => (
  <CfcTaskForm {...props} variant="amendment" />
)
const MovementForm = (props: TaskFormProps) => (
  <CfcTaskForm {...props} variant="movement" />
)

export const taskForms: TaskFormRegistry = {
  "cfc_contract_v1.maker_input": ContractForm,
  "cfc_contract_v1.checker_review": ContractForm,
  "cfc_amendment_v1.maker_input": AmendmentForm,
  "cfc_amendment_v1.checker_review": AmendmentForm,
  "cfc_movement_v1.maker_input": MovementForm,
  "cfc_movement_v1.checker_review": MovementForm,
}

export default taskForms
