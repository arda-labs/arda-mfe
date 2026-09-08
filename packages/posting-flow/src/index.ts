// Root export — the MF shell pre-bundles every entry in remoteSharedDeps as a
// bare package specifier ("@workspace/posting-flow"), which requires "." to be
// exported. Consumers keep importing the per-module subpaths.
export type {
  AccountOption,
  EntryLineRow,
  FetchAccountsFn,
  PostingDirection,
  PostingValidateInput,
  PostingValidateLine,
  PostingValidateResult,
  ValidateFn,
} from "./types"
export { PostingFlowPage, TransactionInfoCard, ControlInfoCard, DetailCard } from "./posting-flow-shell"
export { EntryLinesGrid } from "./entry-lines-grid"
export { computeTotals, newEntryLineRow } from "./entry-lines"
export { PostingPreviewPanel } from "./posting-preview-panel"
