import { useI18n } from "@workspace/i18n"
import type { EntryLinesGridLabels, PostingFlowShellLabels, PostingPreviewPanelLabels } from "@workspace/posting-flow/types"

/**
 * Locale adapter between the finance app namespaces and the locale-agnostic
 * `@workspace/posting-flow` props. Keeps every display string in
 * apps/finance/locales so check:i18n / audit-i18n keep seeing real keys.
 */
export function usePostingFlowLabels(): {
  shell: PostingFlowShellLabels
  grid: EntryLinesGridLabels
  preview: PostingPreviewPanelLabels
} {
  const { t } = useI18n()
  return {
    shell: {
      transactionTitle: t("finance.posting.group.transaction_info"),
      controlTitle: t("finance.posting.group.control_info"),
      controlUnit: t("finance.posting.control.unit"),
      controlStatus: t("finance.posting.control.status"),
      controlEnteredAt: t("finance.posting.control.entered_at"),
      controlEnteredBy: t("finance.posting.control.entered_by"),
    },
    grid: {
      colNo: t("common.field.stt"),
      colDirection: t("finance.posting.col.direction"),
      colAccount: t("finance.posting.col.account"),
      colAccountName: t("finance.posting.col.account_name"),
      colAmount: t("finance.posting.col.amount"),
      colDescription: t("finance.posting.col.description"),
      debit: t("finance.entry.debit"),
      credit: t("finance.entry.credit"),
      addRow: t("finance.posting.action.add_row"),
      deleteRow: t("finance.posting.action.delete_row"),
      chooseAccount: t("finance.posting.choose_account"),
      totalDebit: t("finance.posting.total_debit"),
      totalCredit: t("finance.posting.total_credit"),
      accountDialog: {
        title: t("finance.posting.account_dialog.title"),
        searchPlaceholder: t("finance.posting.account_dialog.search"),
        colCode: t("finance.posting.col.account"),
        colName: t("finance.posting.col.account_name"),
        colCurrency: t("common.field.currency"),
        empty: t("finance.posting.account_dialog.empty"),
        prev: t("common.action.prev"),
        next: t("common.action.next"),
        pageOf: t("common.pagination.page_of"),
        close: t("common.action.close"),
      },
    },
    preview: {
      title: t("finance.posting.preview.run"),
      resolving: t("finance.posting_preview.resolving"),
      valid: t("finance.posting_preview.result.valid"),
      invalid: t("finance.posting_preview.result.invalid"),
      stale: t("finance.posting.preview.stale"),
      unresolved: t("finance.posting_preview.result.unresolved"),
      coaVersion: t("finance.posting.preview.coa_version"),
      globalErrors: t("finance.posting_preview.col.errors"),
      colNo: t("common.field.stt"),
      colDirection: t("finance.posting.col.direction"),
      colAccount: t("finance.posting.col.account"),
      colAmount: t("finance.posting.col.amount"),
      colErrors: t("finance.posting_preview.col.errors"),
      validateFailed: t("finance.posting_preview.validate_failed"),
    },
  }
}
