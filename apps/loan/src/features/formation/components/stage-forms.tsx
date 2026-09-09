import { useI18n } from "@workspace/i18n"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import type { LoanRepayPlan } from "../../api"

/**
 * Tab "Thẩm định" (UT_TWRevalidate) và "Phê duyệt" (UT_PGDReview/GD/Board) —
 * các trường write vào case variables khi complete task. Approval number bắt
 * buộc chỉ ở cấp GD/Board (validate ở page). Thuần presentational.
 */
export interface AppraisalFormValues {
  appraisalNumber: string
  appraisalDate: string
  appraisalOfficer: string
  appraisalOpinion: string
  appraisalAmount: string
  appraisalRate: string
  appraisalTerm: string
}

export interface ApprovalFormValues {
  approvalOfficer: string
  approvalNumber: string
  approvalDate: string
  approvalComment: string
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Trường auto-filled từ user đăng nhập — disabled nhưng vẫn hiện giá trị. */
function AutoField({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} disabled readOnly />
    </div>
  )
}

export function AppraisalFields({
  values,
  onChange,
  officerAuto,
}: {
  values: AppraisalFormValues
  onChange: (next: AppraisalFormValues) => void
  officerAuto: string
}) {
  const { t } = useI18n()
  const set = (patch: Partial<AppraisalFormValues>) =>
    onChange({ ...values, ...patch })

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <TextField
        id="formation-appraisal-no"
        label={t("loan.formation.appraisal.field.appraisal_number")}
        value={values.appraisalNumber}
        onChange={(v) => set({ appraisalNumber: v })}
      />
      <TextField
        id="formation-appraisal-date"
        type="date"
        label={t("loan.formation.appraisal.field.appraisal_date")}
        value={values.appraisalDate}
        onChange={(v) => set({ appraisalDate: v })}
      />
      <AutoField
        id="formation-appraisal-officer"
        label={t("loan.formation.appraisal.field.appraisal_officer")}
        value={values.appraisalOfficer || officerAuto}
      />
      <TextField
        id="formation-appraisal-amount"
        label={t("loan.formation.appraisal.field.appraisal_amount")}
        value={values.appraisalAmount}
        onChange={(v) => set({ appraisalAmount: v })}
      />
      <TextField
        id="formation-appraisal-rate"
        label={t("loan.formation.appraisal.field.appraisal_rate")}
        value={values.appraisalRate}
        onChange={(v) => set({ appraisalRate: v })}
      />
      <TextField
        id="formation-appraisal-term"
        label={t("loan.formation.appraisal.field.appraisal_term")}
        value={values.appraisalTerm}
        onChange={(v) => set({ appraisalTerm: v })}
      />
      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
        <Label htmlFor="formation-appraisal-opinion">
          {t("loan.formation.appraisal.field.appraisal_opinion")}
        </Label>
        <Textarea
          id="formation-appraisal-opinion"
          rows={2}
          value={values.appraisalOpinion}
          onChange={(e) => set({ appraisalOpinion: e.target.value })}
        />
      </div>
    </div>
  )
}

export function ApprovalFields({
  values,
  onChange,
  officerAuto,
  tier,
  disabled,
}: {
  values: ApprovalFormValues
  onChange: (next: ApprovalFormValues) => void
  officerAuto: string
  tier: "PGD" | "GD" | "BOARD"
  disabled?: boolean
}) {
  const { t } = useI18n()
  const set = (patch: Partial<ApprovalFormValues>) =>
    onChange({ ...values, ...patch })

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <AutoField
        id="formation-approval-officer"
        label={t("loan.formation.approval.field.approval_officer")}
        value={values.approvalOfficer || officerAuto}
      />
      <TextField
        id="formation-approval-no"
        label={t("loan.formation.approval.field.approval_number")}
        value={values.approvalNumber}
        disabled={disabled}
        placeholder={
          tier === "GD" || tier === "BOARD"
            ? t("loan.formation.approval.placeholder.number_required")
            : undefined
        }
        onChange={(v) => set({ approvalNumber: v })}
      />
      <TextField
        id="formation-approval-date"
        type="date"
        label={t("loan.formation.approval.field.approval_date")}
        value={values.approvalDate}
        disabled={disabled}
        onChange={(v) => set({ approvalDate: v })}
      />
      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
        <Label htmlFor="formation-approval-comment">
          {t("loan.formation.approval.field.approval_comment")}
        </Label>
        <Textarea
          id="formation-approval-comment"
          rows={2}
          value={values.approvalComment}
          disabled={disabled}
          onChange={(e) => set({ approvalComment: e.target.value })}
        />
      </div>
    </div>
  )
}

/** Read-only rendering của một biến stage đã có trong case variables. */
export function StageVariableList({
  entries,
}: {
  entries: { label: string; value: string }[]
}) {
  const { t } = useI18n()
  if (entries.length === 0) {
    return (
      <p className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        {t("loan.formation.stage.empty")}
      </p>
    )
  }
  return (
    <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
      {entries.map((entry) => (
        <div key={entry.label} className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="shrink-0 text-sm text-muted-foreground">{entry.label}</dt>
          <dd className="min-w-0 truncate text-right text-sm font-medium" title={entry.value}>
            {entry.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Tab "Hợp đồng" — snapshot contract từ dossier (readonly) kèm grid
 * repay_plans rút gọn; badge trạng thái render bởi caller (meta của shell).
 */
export function ContractSnapshot({
  contract,
  repayPlans,
}: {
  contract: LoanRepayPlanHost | null
  repayPlans: LoanRepayPlan[]
}) {
  const { t } = useI18n()
  if (!contract) {
    return (
      <p className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        {t("loan.formation.contract.missing")}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
        <SnapshotField
          label={t("loan.field.contract_code")}
          value={contract.contract_code}
        />
        <SnapshotField
          label={t("loan.field.contract_no")}
          value={contract.contract_no}
        />
        <SnapshotField
          label={t("loan.field.customer")}
          value={contract.customer_code}
        />
        <SnapshotField label={t("loan.field.status")} value={contract.status} />
        <SnapshotField
          label={t("loan.field.contract_date")}
          value={contract.contract_date}
        />
        <SnapshotField
          label={t("loan.field.maturity_date")}
          value={contract.maturity_date}
        />
      </dl>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">
                {t("loan.repay_plan.col.plan_no")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("loan.repay_plan.col.to_date")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("loan.repay_plan.col.principal")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("loan.repay_plan.col.interest")}
              </th>
            </tr>
          </thead>
          <tbody>
            {repayPlans.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-sm text-muted-foreground"
                >
                  {t("loan.repay_plan.empty")}
                </td>
              </tr>
            ) : (
              repayPlans.map((plan) => (
                <tr key={plan.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 tabular-nums">{plan.plan_no}</td>
                  <td className="px-3 py-1.5">{plan.to_date}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {plan.plan_principal_amt_minor}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {plan.plan_interest_amt_minor}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SnapshotField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium">
        {value || "—"}
      </dd>
    </div>
  )
}

type LoanRepayPlanHost = {
  contract_code: string
  contract_no?: string
  customer_code: string
  status: string
  contract_date?: string
  maturity_date?: string
}
