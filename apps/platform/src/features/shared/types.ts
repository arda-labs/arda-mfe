/**
 * Cross-domain reference types for the platform app (no owning screen).
 *
 * Geo admin units feed the provinces/wards catalogs and the areas screen's
 * admin-unit picker, so the type lives in features/shared rather than in one
 * feature folder.
 *
 * Wire source: arda-be/apps/platform-service/internal/domain (geo admin unit).
 */
export interface GeoAdminUnit {
  code: string
  name: string
  full_name?: string
  parent_code?: string
  level: number
  unit_type: string
  country_code: string
  region_code?: string
  effective_from?: string
  effective_to?: string
  is_active: boolean
  metadata?: string
  created_at?: string
  updated_at?: string
}
