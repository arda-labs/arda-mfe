import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type {
  ObjectInfoCardLabels,
  ObjectInfoValue,
  PostingFlowShellLabels,
  PostingTabItem,
  PostingTabsShellLabels,
} from "./types"

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

/** Read-only control-info value (Đơn vị / Trạng thái / Ngày nhập / Người nhập).
 * Compact label:value pair — no Input, no bordered field box. */
export function ControlInfoField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium">{value ?? "—"}</dd>
    </div>
  )
}

/** Right-hand "Thông tin kiểm soát" — fixed read-only fields per FAC spec,
 * rendered as a compact two-column definition list (height-lean redesign:
 * previously one boxed read-only Input per field, ~4× the height). */
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
      <CardContent className="flex-1 content-start">
        <dl className="space-y-2.5">
          <ControlInfoField label={labels.controlUnit} value={unit} />
          <ControlInfoField label={labels.controlStatus} value={status} />
          <ControlInfoField label={labels.controlEnteredAt} value={enteredAt} />
          <ControlInfoField label={labels.controlEnteredBy} value={enteredBy} />
        </dl>
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

/**
 * Tabbed FAC screen shell (mirror of the CRM registration-page skeleton):
 *
 *   section.flex.h-full.min-h-0.flex-col
 *   └ form / scroll container
 *     └ Tabs (flex flex-col)
 *       ├ PageTitle block (title + optional status meta)
 *       ├ sticky tab bar (top-0 z-10 border-b bg-background px-4 py-2)
 *       └ <div.space-y-4.p-4> with one <TabsContent> per `tabs` item
 *
 * Tabs are data-driven (`tabs: {id, label, content}[]`) so a screen renders
 * N repeatable instances with unique ids — nothing is hardcoded. The
 * shadcn/Radix `TabsContent` (with its preventScroll fix) is imported from
 * `@workspace/ui/components/tabs`, never copied. Footer actions stay with the
 * screen, outside the scroll container.
 */
export function PostingTabsShell({
  labels,
  meta,
  tabs,
  defaultValue,
  footer,
}: {
  labels: PostingTabsShellLabels
  /** Optional status badge next to the title (e.g. draft status). */
  meta?: ReactNode
  /** Repeatable tab instances — ids must be unique per screen. */
  tabs: PostingTabItem[]
  /** Initially active tab id; defaults to the first tab. */
  defaultValue?: string
  /** Fixed action row below the scroll container (submit/cancel). */
  footer?: ReactNode
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => event.preventDefault()}>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <Tabs defaultValue={defaultValue ?? tabs[0]?.id} className="flex flex-col">
            <div className="space-y-4 p-4 pb-3">
              <PageTitleBlock title={labels.title} description={labels.description} meta={meta} />
            </div>
            <div className="sticky top-0 z-10 border-b bg-background px-4 py-2">
              <TabsList className="flex h-auto justify-start flex-wrap">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="space-y-4 p-4">
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  {tab.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
        {footer ? <div className="shrink-0 border-t bg-background p-4">{footer}</div> : null}
      </form>
    </section>
  )
}

function PageTitleBlock({
  title,
  description,
  meta,
}: {
  title: string
  description?: string
  meta?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold">{title}</h1>
            {meta}
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}

/**
 * "Thông tin đối tượng" (FAC.201.01 / FAC.300.01): object type select
 * (default EMPLOYEE), editable code/name (auto-filled from the auth user by
 * the screen), identity document fields. Fully controlled via `value` /
 * `onChange` so the screen owns the state and packs it into its payload.
 */
export function ObjectInfoCard({
  labels,
  value,
  onChange,
  objectTypes,
}: {
  labels: ObjectInfoCardLabels
  value: ObjectInfoValue
  onChange: (next: ObjectInfoValue) => void
  /** Select options — pre-translated `{value, label}` pairs from the consumer. */
  objectTypes: { value: string; label: string }[]
}) {
  const set = (patch: Partial<ObjectInfoValue>) => onChange({ ...value, ...patch })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="object-info-type">{labels.objectType}</Label>
          <Select value={value.object_type} onValueChange={(next) => set({ object_type: next })}>
            <SelectTrigger id="object-info-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {objectTypes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="object-info-code">{labels.objectCode}</Label>
          <Input
            id="object-info-code"
            value={value.object_code}
            onChange={(e) => set({ object_code: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="object-info-name">{labels.objectName}</Label>
          <Input
            id="object-info-name"
            value={value.object_name}
            onChange={(e) => set({ object_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="object-info-id-number">{labels.idNumber}</Label>
          <Input
            id="object-info-id-number"
            value={value.id_number}
            onChange={(e) => set({ id_number: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="object-info-issue-date">{labels.issueDate}</Label>
          <Input
            id="object-info-issue-date"
            type="date"
            value={value.issue_date}
            onChange={(e) => set({ issue_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="object-info-issue-place">{labels.issuePlace}</Label>
          <Input
            id="object-info-issue-place"
            value={value.issue_place}
            onChange={(e) => set({ issue_place: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="object-info-address">{labels.address}</Label>
          <Input
            id="object-info-address"
            value={value.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
