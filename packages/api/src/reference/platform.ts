/**
 * Reference wire types owned by platform-service (ADR-005: declared once).
 *
 * platform-service has no Go-generated OpenAPI document yet, so these are
 * transcribed by hand from the Go structs below. When
 * arda-be/contracts/openapi/platform-v1.json is generated, replace this file
 * with aliases of `@workspace/api/generated/platform-v1` and keep the names.
 *
 * Remotes import from here; they must not redeclare these shapes
 * (scripts/check-reference-types.mjs). Client-side narrowing (literal unions a
 * form offers) is done with `Omit<...> & { ... }` on top of these types.
 */

/** arda-be/apps/platform-service/internal/domain/platform.go:13 */
export interface PlatformParameter {
  id: string
  tenant_id?: string | null
  module: string
  key: string
  value: string
  value_type: string
  unit?: string
  scope_type: string
  scope_id?: string | null
  /** Format: date-time */
  effective_from: string
  /** Format: date-time */
  effective_to?: string | null
  description?: string | null
  is_secret: boolean
  /** Format: date-time */
  created_at: string
  /** Format: date-time */
  updated_at: string
}

/** arda-be/apps/platform-service/internal/domain/platform.go:56 */
export interface PlatformOrganization {
  id: string
  tenant_id: string
  parent_id?: string | null
  parent_name?: string | null
  code: string
  name: string
  admin_unit_code?: string | null
  address?: string | null
  is_active: boolean
  /** Format: date-time */
  created_at: string
  /** Format: date-time */
  updated_at: string
}

/** arda-be/apps/platform-service/internal/domain/platform.go:70 */
export interface PlatformGeoAdminUnit {
  code: string
  name: string
  full_name?: string | null
  parent_code?: string | null
  level: number
  unit_type: string
  country_code: string
  region_code?: string | null
  effective_from: string
  effective_to?: string | null
  is_active: boolean
  metadata?: string | null
  /** Format: date-time */
  created_at: string
  /** Format: date-time */
  updated_at: string
}
