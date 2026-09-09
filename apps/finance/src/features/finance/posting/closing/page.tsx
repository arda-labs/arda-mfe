import { PostingCaseListPage } from "../case-list"

/** Kết chuyển thu chi — cases over the journal list (doc type FIN_CLOSING). */
export function ClosingPostingPage() {
  return <PostingCaseListPage flow="CLOSING" documentType="FIN_CLOSING" />
}
