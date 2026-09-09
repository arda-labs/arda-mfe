import { useI18n } from "@workspace/i18n"
import type {
  ObjectInfoCardLabels,
  PostingTabsShellLabels,
} from "@workspace/posting-flow/types"

/**
 * Locale adapter between the loan app namespace and the locale-agnostic
 * `@workspace/posting-flow` props (mirrors finance's posting/labels.ts so
 * every display string stays in apps/loan/locales for check:i18n).
 */

export function useBatchTabsLabels(
  titleKey: string,
  descriptionKey?: string
): PostingTabsShellLabels {
  const { t } = useI18n()
  return {
    title: t(titleKey),
    description: descriptionKey ? t(descriptionKey) : undefined,
  }
}

export function useObjectInfoLabels(): ObjectInfoCardLabels {
  const { t } = useI18n()
  return {
    title: t("loan.batch.object.title"),
    objectType: t("loan.batch.object.object_type"),
    objectCode: t("loan.batch.object.object_code"),
    objectName: t("loan.batch.object.object_name"),
    idNumber: t("loan.batch.object.id_number"),
    issueDate: t("loan.batch.object.issue_date"),
    issuePlace: t("loan.batch.object.issue_place"),
    address: t("loan.batch.object.address"),
  }
}

/** Pre-translated Loại đối tượng options (default EMPLOYEE per EPAS spec). */
export function useObjectTypeOptions(): { value: string; label: string }[] {
  const { t } = useI18n()
  return [
    { value: "EMPLOYEE", label: t("loan.batch.object.type_employee") },
    { value: "CUSTOMER", label: t("loan.batch.object.type_customer") },
    { value: "OTHER", label: t("loan.batch.object.type_other") },
  ]
}

/** Shared control-info labels (Thông tin kiểm soát — right card). */
export function useControlInfoLabels() {
  const { t } = useI18n()
  return {
    controlTitle: t("loan.batch.control.title"),
    controlUnit: t("loan.batch.control.unit"),
    controlStatus: t("loan.batch.control.status"),
    controlEnteredAt: t("loan.batch.control.entered_at"),
    controlEnteredBy: t("loan.batch.control.entered_by"),
  }
}
