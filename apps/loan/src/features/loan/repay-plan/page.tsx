import { useEffect, useMemo, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import {
  formationApi,
  loanApi,
  type LoanContract,
  type LoanDossier,
  type LoanRepayPlan,
} from "../../api"

/**
 * Kế hoạch trả nợ (route /loans/repay-plan): chọn hợp đồng (select
 * ACTIVE/CLOSED-like — đã giải ngân mới có lịch trả nợ) → dossier → grid
 * readonly repay_plans (mirror domain.RepayPlan — STT, ngày kỳ, gốc phải trả,
 * dư nợ sau kỳ, lãi suất, tiền lãi, tổng phải trả). Dư nợ sau kỳ tính FE:
 * lũy kế gốc phải trả trừ lùi từ dư nợ kỳ trước.
 */
export function RepayPlanPage() {
  const { t } = useI18n()
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [contractId, setContractId] = useState<string>("")
  const [dossier, setDossier] = useState<LoanDossier | null>(null)
  const [loadingDossier, setLoadingDossier] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Hợp đồng có khả năng có lịch trả nợ: ACTIVE/CLOSED (đã setActive) —
  // DRAFT/PENDING chưa qua ST_Execute thì chưa có repay plan.
  useEffect(() => {
    let cancelled = false
    setLoadingContracts(true)
    loanApi
      .listContracts({ status: "ACTIVE" })
      .then((res) => {
        if (cancelled) return
        const active = res.items
        // Gộp thêm CLOSED để tra lịch cũ — list thứ hai không fail-open (gate
        // check-no-fail-open): lỗi chỉ làm mất phần CLOSED, active vẫn hiện.
        return loanApi
          .listContracts({ status: "CLOSED" })
          .then((closed) => {
            if (cancelled) return
            const seen = new Set(active.map((c) => c.id))
            setContracts([...active, ...closed.items.filter((c) => !seen.has(c.id))])
          })
          .catch(() => {
            if (!cancelled) setContracts(active)
          })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setContracts([])
          setLoadError(true)
          notify.error(translateApiError(error, t("loan.repay_plan.load_failed")))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContracts(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (!contractId) {
      setDossier(null)
      return
    }
    let cancelled = false
    setLoadingDossier(true)
    setLoadError(false)
    formationApi
      .getDossier(contractId)
      .then((res) => {
        if (!cancelled) setDossier(res)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDossier(null)
          setLoadError(true)
          notify.error(translateApiError(error, t("loan.repay_plan.load_failed")))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDossier(false)
      })
    return () => {
      cancelled = true
    }
  }, [contractId, t])

  const plans = useMemo(
    () => sortPlans(dossier?.repay_plans ?? []),
    [dossier]
  )

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("loan.repay_plan.title")}
        description={t("loan.repay_plan.description")}
        meta={
          dossier ? (
            <Badge variant="secondary" className="shrink-0">
              {t("loan.repay_plan.count_badge", { count: plans.length })}
            </Badge>
          ) : null
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="max-w-xl space-y-1.5">
          <Label htmlFor="repay-plan-contract">
            {t("loan.repay_plan.field.contract")}
          </Label>
          <Select
            value={contractId || undefined}
            onValueChange={setContractId}
            disabled={loadingContracts}
          >
            <SelectTrigger id="repay-plan-contract" className="w-full">
              <SelectValue
                placeholder={
                  loadingContracts
                    ? t("loan.repay_plan.loading")
                    : t("loan.repay_plan.placeholder.contract")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contractLabel(contract)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t("loan.repay_plan.load_failed")}
          </div>
        ) : null}

        {!contractId ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.repay_plan.pick_contract")}
          </div>
        ) : loadingDossier ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.repay_plan.loading")}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.repay_plan.empty")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">
                    {t("loan.repay_plan.col.plan_no")}
                  </TableHead>
                  <TableHead className="w-32">
                    {t("loan.repay_plan.col.to_date")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.repay_plan.col.principal")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.repay_plan.col.outstanding")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.repay_plan.col.rate")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.repay_plan.col.interest")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.repay_plan.col.total")}
                  </TableHead>
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
                      {formatMoney(
                        fromMinor(outstandingAfter(plans, plan.plan_no))
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {plan.interest_rate}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(plan.plan_interest_amt_minor))}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(
                        fromMinor(
                          plan.plan_principal_amt_minor +
                            plan.plan_interest_amt_minor
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Page>
  )
}

function contractLabel(contract: LoanContract) {
  return [
    contract.contract_no || contract.contract_code,
    contract.customer_code,
    contract.status,
  ]
    .filter(Boolean)
    .join(" — ")
}

function sortPlans(plans: LoanRepayPlan[]) {
  return [...plans].sort(
    (a, b) => a.plan_no - b.plan_no || a.term_no - b.term_no
  )
}

/**
 * Dư nợ sau kỳ = tổng gốc phải trả của các kỳ còn lại (từ kỳ này tới hết) —
 * từ tổng dư nợ ban đầu trừ dần gốc theo kỳ; không phụ thuộc coln_* đã thu.
 */
function outstandingAfter(plans: LoanRepayPlan[], planNo: number) {
  return plans
    .filter((plan) => plan.plan_no >= planNo)
    .reduce((sum, plan) => sum + plan.plan_principal_amt_minor, 0)
}
