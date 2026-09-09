import type { LoanAdjustmentKind } from "../api"

/**
 * Per-kind screen spec — mirrors loan-service `validateKindPayload`
 * (internal/service/adjustment_service.go:183) 1:1. Each entry declares the
 * form layout of the "Thông tin điều chỉnh" tab: which common fields are
 * visible, which agreement picker behaviour applies, and which payload keys
 * the form collects (exact BE jsonb key names).
 */
export interface KindFieldSpec {
  /** payload key (BE jsonb name). */
  key: string
  input: "text" | "number" | "date" | "select" | "textarea"
  labelKey: string
  required: boolean
  /** select option values; labels resolved from `optionKeyPrefix.<value>`. */
  options?: string[]
  optionKeyPrefix?: string
  placeholderKey?: string
}

export interface AdjustmentKindSpec {
  kind: LoanAdjustmentKind
  /** i18n labelKey of the kind name (loan.kind.*). */
  labelKey: string
  descriptionKey: string
  /** Thuận từ (agreement) select — recovery requires it (BE top-level). */
  agreementSelect: "none" | "optional" | "required"
  /** Top-level effective_date shown with a per-kind label; null = hidden. */
  effectiveDateLabelKey: string | null
  /** Top-level amount_minor (Số tiền). */
  amount: "none" | "optional" | "required"
  /** Extra per-kind payload fields (exact BE jsonb keys). */
  fields: KindFieldSpec[]
}

const REASON_FIELD = (required: boolean): KindFieldSpec => ({
  key: "reason",
  input: "textarea",
  labelKey: "loan.adjustment_field.reason",
  required,
})

/** "Ghi chú" — free-form payload.note (BE stores the jsonb as-is). */
const NOTE_FIELD: KindFieldSpec = {
  key: "note",
  input: "textarea",
  labelKey: "loan.field.note",
  required: false,
}

const APPLY_DATE = "loan.adjustment_screen.field.apply_date"
const EFFECTIVE_DATE = "loan.adjustment_screen.field.effective_date"
const CHECK_DATE = "loan.adjustment_screen.field.check_date"

export const ADJUSTMENT_KIND_SPECS: Record<LoanAdjustmentKind, AdjustmentKindSpec> = {
  "debt-change": {
    kind: "debt-change",
    labelKey: "loan.kind.debt_change",
    descriptionKey: "loan.adjustment_screen.kind_desc.debt_change",
    agreementSelect: "optional",
    effectiveDateLabelKey: APPLY_DATE,
    amount: "none",
    fields: [
      {
        key: "to_debt_group_code",
        input: "select",
        labelKey: "loan.adjustment_field.to_debt_group_code",
        required: true,
        options: ["GROUP_1", "GROUP_2", "GROUP_3", "GROUP_4", "GROUP_5"],
        optionKeyPrefix: "loan.adjustment_screen.debt_group",
      },
      REASON_FIELD(false),
    ],
  },
  "rate-change": {
    kind: "rate-change",
    labelKey: "loan.kind.rate_change",
    descriptionKey: "loan.adjustment_screen.kind_desc.rate_change",
    agreementSelect: "optional",
    effectiveDateLabelKey: EFFECTIVE_DATE,
    amount: "none",
    fields: [
      {
        key: "new_rate",
        input: "number",
        labelKey: "loan.adjustment_field.new_rate",
        required: true,
        placeholderKey: "loan.adjustment_screen.placeholder.rate",
      },
      REASON_FIELD(false),
    ],
  },
  restructure: {
    kind: "restructure",
    labelKey: "loan.kind.restructure",
    descriptionKey: "loan.adjustment_screen.kind_desc.restructure",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    amount: "none",
    fields: [
      {
        key: "new_term",
        input: "number",
        labelKey: "loan.adjustment_field.new_term",
        required: true,
      },
      {
        key: "new_maturity_date",
        input: "date",
        labelKey: "loan.adjustment_field.new_maturity_date",
        required: true,
      },
      REASON_FIELD(false),
    ],
  },
  waiver: {
    kind: "waiver",
    labelKey: "loan.kind.waiver",
    descriptionKey: "loan.adjustment_screen.kind_desc.waiver",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    // BE: amount_minor OR payload.waiver_percent — one of the two.
    amount: "optional",
    fields: [
      {
        key: "waiver_percent",
        input: "number",
        labelKey: "loan.adjustment_field.waiver_percent",
        required: false,
        placeholderKey: "loan.adjustment_screen.placeholder.percent",
      },
      REASON_FIELD(false),
    ],
  },
  writeoff: {
    kind: "writeoff",
    labelKey: "loan.kind.writeoff",
    descriptionKey: "loan.adjustment_screen.kind_desc.writeoff",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    amount: "required",
    fields: [REASON_FIELD(true)],
  },
  recovery: {
    kind: "recovery",
    labelKey: "loan.kind.recovery",
    descriptionKey: "loan.adjustment_screen.kind_desc.recovery",
    agreementSelect: "required",
    effectiveDateLabelKey: null,
    amount: "required",
    fields: [NOTE_FIELD],
  },
  "fund-check": {
    kind: "fund-check",
    labelKey: "loan.kind.fund_check",
    descriptionKey: "loan.adjustment_screen.kind_desc.fund_check",
    agreementSelect: "optional",
    effectiveDateLabelKey: CHECK_DATE,
    amount: "none",
    fields: [
      {
        key: "result",
        input: "select",
        labelKey: "loan.adjustment_field.result",
        required: true,
        options: ["PASS", "FAIL"],
        optionKeyPrefix: "loan.adjustment_screen.check_result",
      },
    ],
  },
  "revenue-allocation": {
    kind: "revenue-allocation",
    labelKey: "loan.kind.revenue_allocation",
    descriptionKey: "loan.adjustment_screen.kind_desc.revenue_allocation",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    amount: "required",
    fields: [NOTE_FIELD],
  },
  "vfu-fee-allocation": {
    kind: "vfu-fee-allocation",
    labelKey: "loan.kind.vfu_fee_allocation",
    descriptionKey: "loan.adjustment_screen.kind_desc.vfu_fee_allocation",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    amount: "required",
    fields: [NOTE_FIELD],
  },
  "off-balance-export": {
    kind: "off-balance-export",
    labelKey: "loan.kind.off_balance_export",
    descriptionKey: "loan.adjustment_screen.kind_desc.off_balance_export",
    agreementSelect: "optional",
    effectiveDateLabelKey: null,
    // BE validateKindPayload only requires payload.reason — amount optional.
    amount: "optional",
    fields: [REASON_FIELD(true)],
  },
  "mortgage-adjust": {
    kind: "mortgage-adjust",
    labelKey: "loan.kind.mortgage_adjust",
    descriptionKey: "loan.adjustment_screen.kind_desc.mortgage_adjust",
    // BE validates nothing for this kind — minimal note-only screen.
    agreementSelect: "none",
    effectiveDateLabelKey: null,
    amount: "none",
    fields: [NOTE_FIELD],
  },
}
