import { cancelCustomerDraft, listCustomerDrafts } from "../api/drafts"

export type CustomerStatus = "DRAFT" | "NEEDS_CHANGES"

export interface Customer {
  id: string
  customerCode: string
  name: string
  status: CustomerStatus
  mobile: string
  identityNo: string
  updatedAt: string
}

export const customerDraftApi = {
  list(status: CustomerStatus) {
    return listCustomerDrafts<Customer>(status)
  },
  cancel(id: string) {
    return cancelCustomerDraft<Customer>(id)
  },
}
