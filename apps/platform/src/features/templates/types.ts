/**
 * Wire/view types for the file-templates catalog.
 * Wire source: arda-be/apps/platform-service (template handlers).
 */
export interface FileTemplate {
  id: string
  tenant_id: string
  code: string
  name: string
  description?: string
  file_type: string
  file_url: string
  mapping_config?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}
