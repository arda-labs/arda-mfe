import type { ReactNode } from "react"

/**
 * One tab instance rendered by the shared case-tabs shell. `id` must be unique
 * within a screen; `label` is pre-translated by the consumer (the hook fills
 * the system tabs from the shared `common:case_tabs.*` keys).
 */
export interface CaseTabItem {
  id: string
  label: string
  content: ReactNode
}

/**
 * Attachment owner passed to media-service entity links. Files uploaded from
 * a flow screen are attached immediately (temp uploads expire via the TTL
 * worker), so the owner must always be resolvable server-side:
 * - `business_case` + caseId for case/task screens,
 * - the domain entity (e.g. `loan_agreement`, `dpm_savings`) for detail screens.
 */
export interface CaseAttachmentEntity {
  type: string
  id: string
  /** Service tag stored on media_files.module (e.g. "workflow", "loan"). */
  module: string
}

/** One row of `GET /api/workflow/cases/{id}/timeline`. */
export interface CaseTimelineEvent {
  id: number
  caseId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
  actor?: string
  note: string
  data?: unknown
  createdAt: string
}

/**
 * Options for `useCaseTabs`. Business tabs (e.g. "Lịch sử giao dịch") come
 * first; EPAS appends its system tabs after them — Hồ sơ đính kèm then
 * Lưu vết tác vụ.
 */
export interface UseCaseTabsOptions {
  /** Flow-specific tabs (already translated + rendered by the screen). */
  tabs?: CaseTabItem[]
  /** Case id — enables "Lưu vết tác vụ" and defaults the attachment entity. */
  caseId?: string
  /**
   * Attachment owner; defaults to `business_case`/caseId (module "workflow")
   * when a case id is present. Detail screens without a case pass their own
   * domain entity.
   */
  attachmentEntity?: CaseAttachmentEntity
  /**
   * Multiple attachment owners merged into one list (e.g. a savings book whose
   * open-time files live on `dpm_savings` while later ops attach to the case).
   */
  attachmentEntities?: CaseAttachmentEntity[]
  /** Upload is disabled on view-only screens. */
  canUpload?: boolean
  showAttachments?: boolean
  showActivityLog?: boolean
}
