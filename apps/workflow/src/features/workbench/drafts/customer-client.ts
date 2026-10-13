import { cancelCustomerDraft, listCustomerDrafts } from "../api/drafts"
import type { CrmCustomer } from "@workspace/api/reference/crm"

export type CustomerStatus = "DRAFT" | "NEEDS_CHANGES"

/** CRM reference type (ADR-005), narrowed to the draft statuses this list shows. */
export type Customer = Omit<
  Pick<CrmCustomer, "id" | "customerCode" | "name" | "status" | "mobile" | "identityNo" | "updatedAt">,
  "status"
> & { status: CustomerStatus }

export const customerDraftApi = {
  list(status: CustomerStatus) {
    return listCustomerDrafts<Customer>(status)
  },
  cancel(id: string) {
    return cancelCustomerDraft<Customer>(id)
  },
}
