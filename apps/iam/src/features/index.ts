import { usersApi } from "./users/api"
import { groupsApi } from "./groups/api"
import { rolesApi } from "./roles/api"
import { permissionsApi } from "./permissions/api"
import { tenantsApi } from "./tenants/api"

export * from "./users"
export * from "./groups"
export * from "./roles"
export * from "./permissions"
export * from "./tenants"
export * from "./audit"
export * from "./system-settings"

export const adminApi = {
  ...usersApi,
  ...groupsApi,
  ...rolesApi,
  ...permissionsApi,
  ...tenantsApi,
}
