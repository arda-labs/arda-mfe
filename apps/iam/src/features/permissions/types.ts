import type { IamPermission } from "@workspace/api/generated/iam-v1"

export interface Permission {
  id: string
  code: string
  name: string
  module: string
  resource: string
  operation: string
}

export type PermissionApiItem = IamPermission
