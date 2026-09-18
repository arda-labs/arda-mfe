/**
 * Wire/view types for the file-templates catalog.
 * Wire source: arda-be/apps/platform-service (template handlers).
 */
import type { MediaFile } from "@workspace/media"

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

/** Fields needed to resolve, preview and download the attached file. */
export type TemplateFileRef = Pick<
  FileTemplate,
  "code" | "name" | "file_type" | "file_url"
>

/** Attachment reference enriched with media-service metadata when available. */
export type TemplateFileTarget = TemplateFileRef & {
  fileMeta?: MediaFile
}
