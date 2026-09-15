/**
 * Public surface of the loan-batches feature: the collections / disbursements
 * batch screens compose these dialogs and tables through this index instead of
 * deep-importing components (see docs/conventions/feature-structure.md R3).
 */
export {
  ChooseContractDialog,
  type ContractPickerSelection,
} from "./components/choose-contract-dialog"
export { ChooseSourceBatchDialog } from "./components/choose-source-batch-dialog"
export { PostingRulesPreview } from "./components/posting-rules-preview"
export {
  BatchGridHead,
  BatchGridRemoveRowButton,
  PlanGroupedTable,
  type PlanGroupModel,
} from "./components/plan-grouped-table"
