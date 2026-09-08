import { PostingCaseListPage } from "../case-list"

/** Bút toán kép — posted double-entry cases (FIN_DOUBLE_ENTRY). */
export function DoubleEntryPostingPage() {
  return <PostingCaseListPage flow="DOUBLE_ENTRY" documentType="FIN_DOUBLE_ENTRY" />
}
