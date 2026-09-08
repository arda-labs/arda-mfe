import { PostingCaseListPage } from "../case-list"

/** Nhập xuất ngoại bảng — posted off-balance cases (FIN_OFF_BALANCE). */
export function OffBalancePostingPage() {
  return <PostingCaseListPage flow="OFF_BALANCE" documentType="FIN_OFF_BALANCE" />
}
