import type { ReactNode } from "react"
import { useI18n } from "@workspace/i18n"
import { Label } from "@workspace/ui/components/label"
import { formatDateShort } from "@workspace/format"
import type { LoanDisbursement } from "../../api"

/**
 * EPAS-style shared info composition (docs/epas-survey/
 * disbursement-flow-deep-dive.md, "FE shared composition"): both disbursement
 * flow dialogs render the same field-group skeleton — the "Thông tin giải
 * ngân" group (contract / agreement / date / amount / currency) plus a
 * read-only "Thông tin kiểm soát" control block when editing context is
 * available. Plain Label/Input composition, no new dependencies.
 */

/**
 * Titled field group (disbursement info / control info panels).
 */
export function DisbursementFieldGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-md border border-border/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </section>
  )
}

/** Labeled field slot — same structure for inputs and read-only display. */
export function DisbursementField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

/** Read-only labeled value (control block, derived source fields). */
export function DisbursementReadonlyField({
  label,
  value,
}: {
  label: string
  value?: ReactNode
}) {
  return (
    <DisbursementField label={label}>
      <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm tabular-nums text-muted-foreground">
        {value ?? "—"}
      </p>
    </DisbursementField>
  )
}

/**
 * "Thông tin kiểm soát" — system-filled control block (người tạo / ngày tạo /
 * trạng thái). Renders only when editing context (a source row) is available.
 */
export function DisbursementControlInfo({
  item,
  statusLabel,
}: {
  item?: Pick<LoanDisbursement, "created_by" | "created_at" | "status">
  statusLabel?: string
}) {
  const { t } = useI18n()
  if (!item) return null
  return (
    <DisbursementFieldGroup title={t("loan.disbursements.group.control_info")}>
      <div className="grid grid-cols-3 gap-3">
        <DisbursementReadonlyField
          label={t("loan.disbursements.control.created_by")}
          value={item.created_by}
        />
        <DisbursementReadonlyField
          label={t("loan.disbursements.control.created_at")}
          value={item.created_at ? formatDateShort(item.created_at) : undefined}
        />
        <DisbursementReadonlyField
          label={t("loan.disbursements.control.status")}
          value={statusLabel ?? item.status}
        />
      </div>
    </DisbursementFieldGroup>
  )
}
