import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import type { PostingFlowShellLabels } from "./types"

/**
 * EPAS-style posting-flow shell (iteration 9, docs/epas-survey FAC screens):
 *
 *   ┌ Thông tin giao dịch (~2/3) ┐ ┌ Thông tin kiểm soát (~1/3) ┐
 *   ├─────────── DetailCard (titled slot) ──────────────────────┤
 *
 * EPAS renders this as an accordion, but there it never collapses — in arda it
 * is plain Cards with the same visual rhythm. The shell owns layout only:
 * transaction fields are projected in (`transaction` slot) so screens keep
 * their own form state, while the control block is props-driven read-only.
 * All display strings come from the consumer via `labels` so the package
 * stays locale-agnostic (no app namespace baked in).
 */

/** Read-only control-info value (Đơn vị / Trạng thái / Ngày nhập / Người nhập). */
export function ControlInfoField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {value ?? "—"}
      </p>
    </div>
  )
}

/** Right-hand "Thông tin kiểm soát" — fixed read-only fields per FAC spec. */
export function ControlInfoCard({
  labels,
  unit,
  status,
  enteredAt,
  enteredBy,
}: {
  labels: Pick<
    PostingFlowShellLabels,
    "controlTitle" | "controlUnit" | "controlStatus" | "controlEnteredAt" | "controlEnteredBy"
  >
  unit?: ReactNode
  status?: ReactNode
  enteredAt?: ReactNode
  enteredBy?: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.controlTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid flex-1 content-start gap-3">
        <ControlInfoField label={labels.controlUnit} value={unit} />
        <ControlInfoField label={labels.controlStatus} value={status} />
        <ControlInfoField label={labels.controlEnteredAt} value={enteredAt} />
        <ControlInfoField label={labels.controlEnteredBy} value={enteredBy} />
      </CardContent>
    </Card>
  )
}

/** Left-hand "Thông tin giao dịch" — the screen projects its form fields. */
export function TransactionInfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}

/** Bottom detail section — line grid or grouped tables, titled by the screen. */
export function DetailCard({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * Default composition of the three sections. Screens that need a different
 * arrangement (e.g. grouped tables with per-group cards) can import the
 * individual cards above and lay them out themselves.
 */
export function PostingFlowPage({
  labels,
  transaction,
  control,
  detail,
}: {
  labels: PostingFlowShellLabels
  transaction: ReactNode
  control: ReactNode
  detail: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionInfoCard title={labels.transactionTitle}>{transaction}</TransactionInfoCard>
        </div>
        <div className="lg:col-span-1">{control}</div>
      </div>
      {detail}
    </div>
  )
}
