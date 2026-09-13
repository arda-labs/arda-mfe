import { useI18n } from "@workspace/i18n"
import { CaseActivityLogPanel } from "./case-activity-log-panel"
import { CaseAttachmentsPanel } from "./case-attachments-panel"
import type { CaseTabItem, UseCaseTabsOptions } from "./types"

/**
 * EPAS `lib-bpm-tabs` equivalent for arda: business tabs from the screen come
 * first, then the two system tabs — "Hồ sơ đính kèm" (media entity links) and
 * "Lưu vết tác vụ" (case timeline). Screens with their own tab component append
 * the returned items to their tab array; screens without one render it through
 * `CaseTabs` (or any local Tabs layout).
 *
 * `caseId` drives the activity log and defaults the attachment owner to
 * `business_case`/caseId. Detail screens without a case pass `attachmentEntity`
 * for their domain entity (e.g. loan agreement, savings book); the activity
 * log tab is hidden when there is no case.
 */
export function useCaseTabs(options: UseCaseTabsOptions): CaseTabItem[] {
  const { t } = useI18n()
  const {
    tabs = [],
    caseId,
    attachmentEntity,
    attachmentEntities,
    canUpload = true,
    showAttachments = true,
    showActivityLog = true,
  } = options

  const entity =
    attachmentEntity ??
    (caseId ? { type: "business_case", id: caseId, module: "workflow" } : undefined)
  const entities = attachmentEntities ?? (entity ? [entity] : [])

  const result = [...tabs]

  if (showAttachments && entities.length > 0) {
    result.push({
      id: "case-attachments",
      label: t("case_tabs.attachments.title"),
      content: <CaseAttachmentsPanel entities={entities} canUpload={canUpload} />,
    })
  }

  if (showActivityLog && caseId) {
    result.push({
      id: "case-activity-log",
      label: t("case_tabs.activity.title"),
      content: <CaseActivityLogPanel caseId={caseId} />,
    })
  }

  return result
}
