import { useI18n } from "@workspace/i18n"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { fromMinor, toMinor } from "@workspace/format"
import type { LoanContract, LoanContractUpdateInput } from "../../api"

/**
 * Tab "Hồ sơ đề nghị" — form các field whitelist của PUT
 * /api/loan/contracts/{id} (BE UpdateContract, service/loan_service.go:160):
 * contract_no, loan_amt_minor, interest_rate, loan_term, term_unit,
 * contract_date, maturity_date, interest_schedule_day, interest_payment_freq,
 * principal_payment_freq, purpose_code, employee_code, industry_code,
 * loan_method_code. Amount nhập major unit, PUT gửi minor (toMinor).
 */
export interface ProposalFormValues {
  contract_no: string
  loan_amt: string
  interest_rate: string
  loan_term: string
  term_unit: string
  contract_date: string
  maturity_date: string
  interest_schedule_day: string
  interest_payment_freq: string
  principal_payment_freq: string
  purpose_code: string
  employee_code: string
  industry_code: string
  loan_method_code: string
}

type ProposalFieldKey = Exclude<keyof ProposalFormValues, "term_unit">

export function proposalValuesFromContract(
  contract: LoanContract | null
): ProposalFormValues {
  const extra = contract as LoanContract & {
    interest_schedule_day?: number
    interest_payment_freq?: string
    principal_payment_freq?: string
    purpose_code?: string
    employee_code?: string
    industry_code?: string
    loan_method_code?: string
  }
  return {
    contract_no: extra?.contract_no ?? "",
    loan_amt: extra?.loan_amt_minor ? String(fromMinor(extra.loan_amt_minor)) : "",
    interest_rate: extra?.interest_rate != null ? String(extra.interest_rate) : "",
    loan_term: extra?.loan_term != null ? String(extra.loan_term) : "",
    term_unit: extra?.term_unit ?? "MONTH",
    contract_date: extra?.contract_date ?? "",
    maturity_date: extra?.maturity_date ?? "",
    interest_schedule_day:
      extra?.interest_schedule_day != null
        ? String(extra.interest_schedule_day)
        : "",
    interest_payment_freq: extra?.interest_payment_freq ?? "",
    principal_payment_freq: extra?.principal_payment_freq ?? "",
    purpose_code: extra?.purpose_code ?? "",
    employee_code: extra?.employee_code ?? "",
    industry_code: extra?.industry_code ?? "",
    loan_method_code: extra?.loan_method_code ?? "",
  }
}

/**
 * PUT body từ form values — trim, chuỗi rỗng thành undefined, amount/rate/term
 * ép số (BE validate > 0; loan_amt nhập major → minor).
 */
export function proposalPayload(
  values: ProposalFormValues
): LoanContractUpdateInput {
  const amtMajor = Number(values.loan_amt.replace(/,/g, ""))
  const term = Number(values.loan_term)
  const rate = Number(values.interest_rate)
  const scheduleDay = values.interest_schedule_day.trim()
    ? Number(values.interest_schedule_day)
    : undefined
  return {
    contract_no: values.contract_no.trim() || undefined,
    loan_amt_minor: Number.isFinite(amtMajor) ? toMinor(amtMajor) : 0,
    interest_rate: Number.isFinite(rate) ? rate : 0,
    loan_term: Number.isFinite(term) ? term : 0,
    term_unit: values.term_unit.trim() || undefined,
    contract_date: values.contract_date.trim() || undefined,
    maturity_date: values.maturity_date.trim() || undefined,
    interest_schedule_day: scheduleDay,
    interest_payment_freq: values.interest_payment_freq.trim() || undefined,
    principal_payment_freq: values.principal_payment_freq.trim() || undefined,
    purpose_code: values.purpose_code.trim() || undefined,
    employee_code: values.employee_code.trim() || undefined,
    industry_code: values.industry_code.trim() || undefined,
    loan_method_code: values.loan_method_code.trim() || undefined,
  }
}

const TERM_UNITS = ["MONTH", "WEEK", "DAY"] as const
const PAYMENT_FREQS = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUALLY",
  "ANNUALLY",
  "AT_MATURITY",
] as const

/** Thuần presentational — state form nằm ở page (form một lần submit duy nhất). */
export function ProposalFields({
  values,
  onChange,
  disabled,
}: {
  values: ProposalFormValues
  onChange: (next: ProposalFormValues) => void
  disabled: boolean
}) {
  const { t } = useI18n()

  const set = (patch: Partial<ProposalFormValues>) =>
    onChange({ ...values, ...patch })

  const text = (key: ProposalFieldKey, id: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(`loan.formation.proposal.field.${key}`)}</Label>
      <Input
        id={id}
        value={values[key]}
        disabled={disabled}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </div>
  )

  const dateInput = (key: "contract_date" | "maturity_date", id: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(`loan.formation.proposal.field.${key}`)}</Label>
      <Input
        id={id}
        type="date"
        value={values[key]}
        disabled={disabled}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </div>
  )

  const freqSelect = (
    key: "interest_payment_freq" | "principal_payment_freq",
    id: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(`loan.formation.proposal.field.${key}`)}</Label>
      <Select
        value={values[key] || "NONE"}
        disabled={disabled}
        onValueChange={(value) =>
          set({ [key]: value === "NONE" ? "" : value })
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">
            {t("loan.formation.proposal.freq.none")}
          </SelectItem>
          {PAYMENT_FREQS.map((freq) => (
            <SelectItem key={freq} value={freq}>
              {t(`loan.formation.proposal.freq.${freq}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {text("contract_no", "formation-proposal-no")}
      {text("loan_amt", "formation-proposal-amount")}
      {text("interest_rate", "formation-proposal-rate")}
      {text("loan_term", "formation-proposal-term")}
      <div className="space-y-1.5">
        <Label htmlFor="formation-proposal-unit">
          {t("loan.formation.proposal.field.term_unit")}
        </Label>
        <Select
          value={values.term_unit || "MONTH"}
          disabled={disabled}
          onValueChange={(value) => set({ term_unit: value })}
        >
          <SelectTrigger id="formation-proposal-unit" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TERM_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {t(`loan.formation.proposal.term_unit.${unit}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {dateInput("contract_date", "formation-proposal-date")}
      {dateInput("maturity_date", "formation-proposal-maturity")}
      {text("interest_schedule_day", "formation-proposal-schedule-day")}
      {freqSelect("interest_payment_freq", "formation-proposal-int-freq")}
      {freqSelect("principal_payment_freq", "formation-proposal-prin-freq")}
      {text("purpose_code", "formation-proposal-purpose")}
      {text("employee_code", "formation-proposal-employee")}
      {text("industry_code", "formation-proposal-industry")}
      {text("loan_method_code", "formation-proposal-method")}
    </div>
  )
}
