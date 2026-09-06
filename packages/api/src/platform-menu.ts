import { api } from "./instance"
import type { ApiSuccess } from "./client"

/**
 * DB-driven navigation entry served by platform-service
 * (`GET /api/platform/menus/effective`). Mirrors domain.MenuItem.
 */
export interface PlatformMenuItem {
  id: string
  tenant_id?: string
  parent_id?: string
  code: string
  title: string
  path: string
  icon: string
  remote: string
  required_permission: string
  sort_order: number
  is_active: boolean
}

function unwrapMenu(payload: unknown): PlatformMenuItem[] {
  if (Array.isArray(payload)) return payload as PlatformMenuItem[]
  const envelope = payload as Partial<ApiSuccess<PlatformMenuItem[]>>
  return envelope?.result ?? []
}

/** Effective menu for the verified tenant (global seeds + tenant overrides). */
export async function fetchEffectiveMenu(): Promise<PlatformMenuItem[]> {
  const payload = await api.get<unknown>("/api/platform/menus/effective")
  return unwrapMenu(payload).filter((item) => item.is_active)
}

/** Raw menu rows including inactive ones (admin surface). */
export async function fetchMenuItems(): Promise<PlatformMenuItem[]> {
  const payload = await api.get<unknown>("/api/platform/menus")
  return unwrapMenu(payload)
}

export async function upsertMenuItem(
  item: Partial<PlatformMenuItem> & Pick<PlatformMenuItem, "code" | "title">
): Promise<PlatformMenuItem> {
  const payload = await api.put<ApiSuccess<PlatformMenuItem>>(
    "/api/platform/menus",
    item
  )
  return payload.result
}

export async function deleteMenuItem(id: string): Promise<void> {
  await api.delete(`/api/platform/menus/${encodeURIComponent(id)}`)
}
