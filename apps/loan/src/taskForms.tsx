import { createAppLocaleLoader } from "@workspace/i18n"
import type { TaskFormProps, TaskFormRegistry } from "@workspace/workflow-task"
import {
  LoanTaskForm,
  type LoanTaskFormVariant,
} from "@/features/task-forms/loan-task-form"

/**
 * Module Federation `./taskForms` entry for the loan remote.
 *
 * The workbench form host loads this module and resolves the form by the
 * server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). All loan
 * operation case types share one component; the variant only selects which
 * domain read API is called and which rows are shown.
 */
export const locales = createAppLocaleLoader("loan", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

function variantForm(variant: LoanTaskFormVariant) {
  return (props: TaskFormProps) => <LoanTaskForm {...props} variant={variant} />
}

const DisbursementForm = variantForm("disbursement")
const CollectionForm = variantForm("collection")
const GeneralProvisionForm = variantForm("general_provision")
const SpecificProvisionForm = variantForm("specific_provision")
const DisbursementBatchForm = variantForm("disbursement_batch")
const CollectionBatchForm = variantForm("collection_batch")

export const taskForms: TaskFormRegistry = {
  "lnm_disb_register_v2.maker_input": DisbursementForm,
  "lnm_disb_register_v2.checker_review": DisbursementForm,
  "lnm_disb_complete_v2.maker_input": DisbursementForm,
  "lnm_disb_complete_v2.checker_review": DisbursementForm,
  "lnm_collection_v2.maker_input": CollectionForm,
  "lnm_collection_v2.checker_review": CollectionForm,
  "lnm_disb_batch_register_v2.maker_input": DisbursementBatchForm,
  "lnm_disb_batch_register_v2.checker_review": DisbursementBatchForm,
  "lnm_disb_batch_complete_v2.maker_input": DisbursementBatchForm,
  "lnm_disb_batch_complete_v2.checker_review": DisbursementBatchForm,
  "lnm_collection_batch_v2.maker_input": CollectionBatchForm,
  "lnm_collection_batch_v2.checker_review": CollectionBatchForm,
  "lnm_general_provision_v2.maker_input": GeneralProvisionForm,
  "lnm_general_provision_v2.checker_review": GeneralProvisionForm,
  "lnm_specific_provision_v1.maker_input": SpecificProvisionForm,
  "lnm_specific_provision_v1.checker_review": SpecificProvisionForm,
}

export default taskForms
