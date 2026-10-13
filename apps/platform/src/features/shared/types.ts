/**
 * Cross-domain reference types for the platform app (no owning screen).
 *
 * Geo admin units feed the provinces/wards catalogs and the areas screen's
 * admin-unit picker. The shape is the platform reference type (ADR-005):
 * declared once in @workspace/api/reference/platform.
 */
import type { PlatformGeoAdminUnit } from "@workspace/api/reference/platform"

export type GeoAdminUnit = PlatformGeoAdminUnit
