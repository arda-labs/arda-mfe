import { PostingCaseListPage } from "../case-list"

/** Hủy giao dịch — cases over the journal list (reversal doc type FIN_TXN_CANCEL). */
export function CancellationPostingPage() {
  return <PostingCaseListPage flow="CANCELLATION" documentType="FIN_TXN_CANCEL" />
}
