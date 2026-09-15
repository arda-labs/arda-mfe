/**
 * Wire/view types for the credit-institutions catalog.
 * Wire source: arda-be/apps/platform-service (credit institution handlers).
 */
export interface CreditInstitution {
  id: string
  tenant_id: string
  code: string
  name: string
  address: string
  status: "active" | "inactive"
  effective_from?: string
  short_name?: string
  phone?: string
  email?: string
  license_no?: string
  license_date?: string
  tax_code?: string
  website?: string
  note?: string
  created_at?: string
  updated_at?: string
}
