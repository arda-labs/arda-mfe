/**
 * Reference wire types owned by crm-service (ADR-005: declared once).
 *
 * crm-service has no Go-generated OpenAPI document yet, so these are
 * transcribed by hand from the Go structs below. When
 * arda-be/contracts/openapi/crm-v1.json is generated, replace this file with
 * aliases of `@workspace/api/generated/crm-v1` and keep the names.
 *
 * The customer resource is camelCase on the wire (see WIRE_CASE_BASELINE in
 * scripts/check-feature-structure.mjs); it follows the Go json tags as-is.
 */

/** arda-be/apps/crm-service/internal/repository/customer_repository.go:18 */
export interface CrmCustomer {
  id: string
  tenantId: string
  orgId: string
  customerCode: string
  workflowCaseId?: string
  customerType: string
  name: string
  email: string
  status: string
  mobile: string
  identityNo: string
  address: string
  segment: string
  rank: string
  riskLevel: string
  generalInfo: Record<string, unknown>
  personalInfo: Record<string, unknown>
  businessInfo: Record<string, unknown>
  extendedInfo: Record<string, unknown>
  /** Format: date-time */
  createdAt: string
  /** Format: date-time */
  updatedAt: string
}
