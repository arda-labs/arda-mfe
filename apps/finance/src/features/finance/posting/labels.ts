import { useI18n } from "@workspace/i18n"
import type {
  ChooseTransactionDialogLabels,
  EntryLinesGridLabels,
  ObjectInfoCardLabels,
  PostingFlowShellLabels,
  PostingPreviewPanelLabels,
  PostingTabsShellLabels,
} from "@workspace/posting-flow/types"

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

/** Labels for `PostingTabsShell` (tabbed FAC screens: cancellation,
 * off-balance). */
export function usePostingTabsLabels(titleKey: string, descriptionKey?: string): PostingTabsShellLabels {
  const { t } = useI18n()
  return {
    title: t(titleKey),
    description: descriptionKey ? t(descriptionKey) : undefined,
  }
}

/** Labels for `ObjectInfoCard` (the FAC "object info" block). */
export function useObjectInfoLabels(): ObjectInfoCardLabels {
  const { t } = useI18n()
  return {
    title: t("finance.posting.object.title"),
    objectType: t("finance.posting.object.object_type"),
    objectCode: t("finance.posting.object.object_code"),
    objectName: t("finance.posting.object.object_name"),
    idNumber: t("finance.posting.object.id_number"),
    issueDate: t("finance.posting.object.issue_date"),
    issuePlace: t("finance.posting.object.issue_place"),
    address: t("finance.posting.object.address"),
  }
}

/** Pre-translated Loại đối tượng options (default EMPLOYEE per EPAS spec). */
export function useObjectTypeOptions(): { value: string; label: string }[] {
  const { t } = useI18n()
  return [
    { value: "EMPLOYEE", label: t("finance.posting.object.type_employee") },
    { value: "CUSTOMER", label: t("finance.posting.object.type_customer") },
    { value: "OTHER", label: t("finance.posting.object.type_other") },
  ]
}

/** Labels for `ChooseTransactionDialog` (chọn giao dịch gốc). */
export function useChooseTransactionLabels(): ChooseTransactionDialogLabels {
  const { t } = useI18n()
  return {
    title: t("finance.posting.choose_transaction.title"),
    docType: t("finance.posting.choose_transaction.doc_type"),
    docTypeAll: t("finance.posting.choose_transaction.doc_type_all"),
    searchCode: t("finance.posting.choose_transaction.search_code"),
    searchCodePlaceholder: t("finance.posting.choose_transaction.search_code_placeholder"),
    fromDate: t("finance.posting.choose_transaction.from_date"),
    toDate: t("finance.posting.choose_transaction.to_date"),
    colEntryNo: t("finance.journal.field.entry_no"),
    colDate: t("finance.journal.field.accounting_date"),
    colType: t("finance.posting.choose_transaction.col_type"),
    colAmount: t("finance.posting.choose_transaction.col_amount"),
    colDescription: t("finance.posting.col.description"),
    empty: t("finance.posting.choose_transaction.empty"),
    prev: t("common.action.prev"),
    next: t("common.action.next"),
    pageOf: t("common.pagination.page_of"),
    close: t("common.action.close"),
    choose: t("finance.posting.choose_transaction.choose"),
  }
}
