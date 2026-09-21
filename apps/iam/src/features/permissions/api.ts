import { deleteCanonical, getCanonical, postCanonical, putCanonical } from "@workspace/api"
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
  getExportUrl: (params?: AdminListInput & { format?: string }) => {
    const query = buildAdminListQuery(params)
    if (params?.format) query.set("format", params.format)
    return `/api/admin/permissions/export?${query.toString()}`
  },
  createPermission: (data: {
    code: string
    name: string
    module: string
    resource: string
    operation: string
  }) => postCanonical("/api/admin/permissions", data),
  /** Edit a permission (code is immutable). */
  updatePermission: (
    id: string,
    data: {
      name?: string
      module?: string
      resource?: string
      operation?: string
    }
  ) => putCanonical(`/api/admin/permissions/${encodeURIComponent(id)}`, data),
  deletePermission: (id: string) => deleteCanonical(`/api/admin/permissions/${id}`),
}
