export type PlatformDraftDomain =
  | "crm_customer_registration"
  | "finance_incoming"
  | "finance_outgoing"
  | "hrm_employee_registration"

export type PlatformDraftStatus = "DRAFT" | "NEEDS_CHANGES"

export type PlatformDraftSource =
  "crm" | "finance_incoming" | "finance_outgoing" | "hrm"

export interface PlatformDraft {
  id: string
  domain: PlatformDraftDomain
  code: string
  title: string
  subtitle?: string
  status: string
  displayStatus: PlatformDraftStatus
  updatedAt: string
  openHref: string
  canCancel: boolean
}

export interface PlatformDraftsResult {
  items: PlatformDraft[]
  errors: Partial<Record<PlatformDraftSource, string>>
}

export type PlatformDraftDomainFilter = "ALL" | PlatformDraftDomain
export type PlatformDraftStatusFilter = "ALL" | PlatformDraftStatus
