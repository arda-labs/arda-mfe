import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { normalizePermission } from "../permissions/api"
import type { PermissionApiItem } from "../permissions/types"
import {
  buildAdminListQuery,
  targetPath,
  type AdminListInput,
} from "../users/api"
import type { Role, RoleApiItem } from "./types"

export const normalizeRole = (role: RoleApiItem): Role => ({
  id: role.id,
  code: role.code,
  name: role.name,
  status: role.status,
  tenantId: role.tenant_id,
  permissions: role.permissions?.map(normalizePermission),
})

export const rolesApi = {
  listRoles: (params?: AdminListInput) =>
    getCanonical<ListResponse<RoleApiItem>>(
      `/api/admin/roles?${buildAdminListQuery(params).toString()}`
    ).then((res) => ({
      ...res,
      items: res.items.map(normalizeRole),
    })),
  getRole: (id: string, tenantId: string) =>
    getCanonical<{ role: RoleApiItem; permissions: PermissionApiItem[] }>(
      targetPath(`/api/admin/roles/${id}`, tenantId)
    ).then((res) => ({
      role: normalizeRole(res.role),
      permissions: (res.permissions ?? []).map(normalizePermission),
    })),
  createRole: (data: { code: string; name: string; tenantId: string }) =>
    postCanonical("/api/admin/roles", {
      code: data.code,
      name: data.name,
      tenant_id: data.tenantId,
    }),
  updateRole: (id: string, tenantId: string, data: { name?: string }) =>
    putCanonical(targetPath(`/api/admin/roles/${id}`, tenantId), data),
  deleteRole: (id: string, tenantId: string) =>
    deleteCanonical(targetPath(`/api/admin/roles/${id}`, tenantId)),
  listRolePermissions: (roleId: string, tenantId: string) =>
    getCanonical<{ permissions: PermissionApiItem[] }>(
      targetPath(`/api/admin/roles/${roleId}/permissions`, tenantId)
    ).then((res) => ({
      permissions: (res.permissions ?? []).map(normalizePermission),
    })),
  assignRolePermission: (roleId: string, permissionId: string, tenantId: string) =>
    postCanonical(
      targetPath(`/api/admin/roles/${roleId}/permissions/assign`, tenantId),
      { permission_id: permissionId }
    ),
  unassignRolePermission: (roleId: string, permissionId: string, tenantId: string) =>
    deleteCanonical(
      targetPath(
        `/api/admin/roles/${roleId}/permissions/${permissionId}`,
        tenantId
      )
    ),
}
