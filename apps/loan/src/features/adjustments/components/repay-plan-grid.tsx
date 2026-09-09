import { useEffect, useMemo, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import { formationApi, type LoanRepayPlan } from "../../api"

/**
 * Grid readonly kế hoạch trả nợ của hợp đồng (EPAS debt-change: hồ sơ kèm
 * lịch trả nợ hiện hành để đối chiếu trước khi chuyển nhóm nợ). Fetch dossier
 * theo contract_code → repay_plans; cột: kỳ, ngày, gốc, lãi. Rỗng hiện
 * "chưa có kế hoạch".
 */
export function RepayPlanGrid({ contractCode }: { contractCode: string }) {
  const { t } = useI18n()
  const [dossier, setDossier] = useState<{
    contractId: string
    plans: LoanRepayPlan[]
  }>({ contractId: "", plans: [] })
  const loading = dossier.contractId !== contractCode

  useEffect(() => {
    if (!contractCode) return
    let cancelled = false
    formationApi
      .getDossier(contractCode)
      .then((res) => {
        if (!cancelled) {
          setDossier({ contractId: contractCode, plans: res.repay_plans ?? [] })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDossier({ contractId: contractCode, plans: [] })
          notify.error(translateApiError(error, t("loan.repay_plan.load_failed")))
        }
      })
    return () => {
      cancelled = true
    }
  }, [contractCode, t])

  const plans = useMemo(
    () =>
      [...dossier.plans].sort(
        (a, b) => a.plan_no - b.plan_no || a.term_no - b.term_no
      ),
    [dossier]
  )

  if (!contractCode || loading) {
    return (
      <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        {loading ? t("loan.loading") : t("loan.adjustment_screen.repay_plan_hint")}
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        {t("loan.adjustment_screen.no_repay_plan")}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">{t("loan.repay_plan.col.plan_no")}</TableHead>
            <TableHead className="w-32">{t("loan.repay_plan.col.to_date")}</TableHead>
            <TableHead className="text-right">
              {t("loan.repay_plan.col.principal")}
            </TableHead>
            <TableHead className="text-right">{t("loan.repay_plan.col.interest")}</TableHead>
            <TableHead className="text-right">{t("loan.repay_plan.col.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="tabular-nums">{plan.plan_no}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateShort(plan.to_date)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(fromMinor(plan.plan_principal_amt_minor))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(fromMinor(plan.plan_interest_amt_minor))}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(
                  fromMinor(
                    plan.plan_principal_amt_minor + plan.plan_interest_amt_minor
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
