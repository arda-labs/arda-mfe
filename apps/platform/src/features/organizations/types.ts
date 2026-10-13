/**
 * Wire/view types for the organizations screen.
 * The organization shape is the platform reference type (ADR-005): declared
 * once in @workspace/api/reference/platform, never redeclared here.
 */
import type { ListQueryInput } from "@workspace/api/list"
import type { PlatformOrganization } from "@workspace/api/reference/platform"

export type Organization = PlatformOrganization

export type OrganizationsListParams = ListQueryInput & {
  is_active?: string
}
