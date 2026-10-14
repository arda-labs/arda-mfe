import type { useI18n } from "@workspace/i18n"
import type { KeyFigure } from "@workspace/ui/components/key-figures"
import { formatDateShort } from "@workspace/format"
import { MATURITY_WARNING_DAYS, type TermProgress } from "./term-progress"

type Translate = ReturnType<typeof useI18n>["t"]

/**
 * The "Đáo hạn" key figure of a term deposit: maturity date, elapsed-term bar
 * and a countdown. Only an open contract (`open`) counts down or warns.
 */
export function maturityFigure(
  t: Translate,
  maturityDate: string,
  term: TermProgress,
  open: boolean
): KeyFigure {
  const days = term.daysToMaturity
  let hint: string | undefined
  let tone: KeyFigure["tone"]
  if (open && days !== null) {
    if (days > 0) hint = t("deposit.term.days_left", { count: days })
    else if (days === 0) hint = t("deposit.term.due_today")
    else hint = t("deposit.term.overdue", { count: -days })
    if (days <= MATURITY_WARNING_DAYS) tone = "warning"
  }
  return {
    label: t("deposit.term.maturity"),
    value: maturityDate ? formatDateShort(maturityDate) : "—",
    hint,
    tone,
    progress: open ? term.elapsed : undefined,
  }
}
