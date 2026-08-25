/**
 * Generated from arda-be/contracts/openapi/iam-v1.json.
 * Do not edit by hand; regenerate when the approved OpenAPI operation changes.
 */
export interface IamPermission {
  id: string
  code: string
  name: string
  module: string
  resource: string
  operation: string
  created_at?: string
}

export interface IamPermissionListResult {
  items: IamPermission[]
  page: number
  per_page: number
  total: number
}

export interface IamCreatePermissionRequest {
  code: string
  name?: string
  module: string
  resource: string
  operation: string
}
