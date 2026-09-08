import { PostingCaseListPage } from "../case-list"

/** Bút toán lẻ — posted single-entry cases (FIN_SINGLE_ENTRY). */
export function SingleEntryPostingPage() {
  return <PostingCaseListPage flow="SINGLE_ENTRY" documentType="FIN_SINGLE_ENTRY" />
}
