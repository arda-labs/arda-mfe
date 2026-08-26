import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { buildAdminListQuery, type AdminListInput } from "../users/api"
import type { Permission, PermissionApiItem } from "./types"

export const normalizePermission = (permission: PermissionApiItem): Permission => ({
  id: permission.id,
  code: permission.code,
  name: permission.name,
  module: permission.module,
  resource: permission.resource,
  operation: permission.operation,
})

export const permissionsApi = {
  listPermissions: (params?: AdminListInput) =>
    getCanonical<ListResponse<PermissionApiItem>>(
      `/api/admin/permissions?${buildAdminListQuery(params).toString()}`
    ).then((res) => ({
      ...res,
      items: res.items.map(normalizePermission),
    })),
  createPermission: (data: {
    code: string
    name: string
    module: string
    resource: string
    operation: string
  }) => postCanonical("/api/admin/permissions", data),
  deletePermission: (id: string) => deleteCanonical(`/api/admin/permissions/${id}`),
}
