import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@workspace/auth/store"
import type { ComboboxOption } from "@workspace/ui/components/combobox"
import { tenantsApi } from "../tenants/api"

const TENANT_OPTIONS_PAGE_SIZE = 200

/**
 * Tenants the current admin may assign a user to. A global admin picks from the
 * whole registry; a tenant admin only from their own active memberships. The
 * reserved "system" scope of the superadmin is never a business tenant, so it
 * is not offered here.
 */
export function useTenantOptions() {
  const user = useAuthStore((state) => state.user)
  const isGlobalAdmin = Boolean(user?.isGlobalAdmin)

  const registry = useQuery({
    queryKey: ["iam", "tenants", "options"],
    enabled: isGlobalAdmin,
    staleTime: 60_000,
    queryFn: () => tenantsApi.listTenants({ perPage: TENANT_OPTIONS_PAGE_SIZE }),
  })

  const options: ComboboxOption[] = isGlobalAdmin
    ? (registry.data?.items ?? [])
        .filter((tenant) => tenant.status === "ACTIVE")
        .map((tenant) => ({
          value: tenant.id,
          code: tenant.code,
          label: tenant.name,
        }))
    : (user?.tenantMemberships ?? [])
        .filter(
          (m) => m.status === "ACTIVE" && m.tenantStatus === "ACTIVE"
        )
        .map((m) => ({
          value: m.tenantId,
          code: m.tenantCode,
          label: m.tenantName,
        }))

  const actorTenantId = user?.activeTenantId || user?.tenantId || ""
  const defaultTenantId = options.some((o) => o.value === actorTenantId)
    ? actorTenantId
    : options.length === 1
      ? options[0]!.value
      : ""

  return {
    options,
    defaultTenantId,
    isLoading: isGlobalAdmin && registry.isLoading,
  }
}
