import type { ReactNode } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor } from "@workspace/format"
import { Trash2, X } from "lucide-react"

/**
 * One plan group of the credit-contract list grid (iteration 13,
 * EPAS list-edit-construct — "Danh sách hợp đồng tín dụng"): header card
 * "Mã phương án: {plan}" with the group total (readonly — EPAS derives
 * totals from rows, never edits them) and an optional Xoá nhóm button,
 * followed by the group's DataTable rows.
 */
export interface PlanGroupModel {
  // plan_code key of the group; "" → "Chưa phân phương án".
  planCode: string
  /** Group total in minor units — displayed readonly in the header. */
  totalMinor: number
  currency: string
  /** Xoá nhóm — absent → no button (readonly groups, e.g. complete form). */
  onRemove?: () => void
  /** Prebuilt <TableRow> nodes for this group's rows. */
  rows: ReactNode[]
}

/**
 * Shared grouped grid used by the three loan batch screens (đăng ký giải
 * ngân, hoàn tất giải ngân, thu nợ). The screen owns row state and renders
 * each row as a <TableRow>; this component only lays out group cards,
 * headers and the empty state, so it stays row-shape agnostic.
 */
export function PlanGroupedTable({
  groups,
  headerCells,
  emptyLabel,
}: {
  groups: PlanGroupModel[]
  /** <TableRow> of <TableHead>s — identical across groups. */
  headerCells: ReactNode
  /** Shown when there is no group/row at all. */
  emptyLabel: string
}) {
  const { t } = useI18n()

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Card key={group.planCode || "__no_plan__"}>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-2">
            <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold">
              {group.planCode ? (
                <span className="truncate">
                  {t("loan.batch_grid.plan_label", { plan: group.planCode })}
                </span>
              ) : (
                <Badge variant="outline" className="font-normal">
                  {t("loan.batch_grid.no_plan")}
                </Badge>
              )}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("loan.batch_grid.group_total")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatAmount(fromMinor(group.totalMinor, group.currency), group.currency)}
                </p>
              </div>
              {group.onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={group.onRemove}
                >
                  <X className="size-3.5" />
                  {t("loan.batch_grid.remove_group")}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>{headerCells}</TableRow>
                </TableHeader>
                <TableBody>{group.rows}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Shared <TableHead> cell so the three screens keep identical column look. */
export function BatchGridHead({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return <TableHead className={className}>{label}</TableHead>
}

/** Per-row Xoá dòng button (icon-only, destructive ghost). */
export function BatchGridRemoveRowButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Trash2 className="size-3.5" />
    </Button>
  )
}
