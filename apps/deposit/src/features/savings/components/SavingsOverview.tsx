import { useI18n } from "@workspace/i18n"
import { KeyFigures, type KeyFigure } from "@workspace/ui/components/key-figures"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"
import { PropertyList } from "@workspace/ui/components/property-list"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import type { Savings } from "../../api"
import { maturityFigure } from "../../../lib/maturity-figure"
import { CaseApprovalSection } from "../../shared/CaseApprovalSection"
import type { SavingsLifecycleStates, SavingsSummary } from "../savings-summary"

/** Mở sổ → Đang gửi → Tất toán (header progress). */
export function SavingsLifecycle({
  savings,
  life,
}: {
  savings: Savings
  life: SavingsLifecycleStates
}) {
  const { t } = useI18n()
  return (
    <LifecycleSteps
      label={t("deposit.savings.detail.lifecycle.label")}
      steps={[
        {
          id: "opened",
          label: t("deposit.savings.detail.lifecycle.opened"),
          state: life.opened,
          meta: savings.open_date ? formatDateShort(savings.open_date) : undefined,
        },
        {
          id: "holding",
          label: t("deposit.savings.detail.lifecycle.holding"),
          state: life.holding,
          meta: savings.maturity_date
            ? t("deposit.savings.detail.lifecycle.matures", {
                date: formatDateShort(savings.maturity_date),
              })
            : undefined,
        },
        {
          id: "settled",
          label: t("deposit.savings.detail.lifecycle.settled"),
          state: life.settled,
        },
      ]}
    />
  )
}

export function SavingsFigures({
  savings,
  summary,
}: {
  savings: Savings
  summary: SavingsSummary
}) {
  const { t } = useI18n()
  const money = (minor: number) =>
    formatAmount(fromMinor(minor, summary.currencyCode), summary.currencyCode)
  const items: KeyFigure[] = [
    {
      label: t("deposit.savings.field.principal"),
      value: money(summary.principalMinor),
      hint:
        summary.capitalizedMinor > 0
          ? t("deposit.savings.detail.figure.capitalized", {
              amount: money(summary.capitalizedMinor),
            })
          : undefined,
    },
    {
      label: t("deposit.savings.field.accrued"),
      value: money(summary.accruedMinor),
      hint:
        summary.pendingInterestOps > 0
          ? t("deposit.savings.detail.figure.pending_ops", {
              count: summary.pendingInterestOps,
            })
          : summary.interestPaidMinor > 0
            ? t("deposit.savings.detail.figure.paid", {
                amount: money(summary.interestPaidMinor),
              })
            : undefined,
      tone: summary.pendingInterestOps > 0 ? "warning" : undefined,
    },
    {
      label: t("deposit.savings.detail.figure.rate"),
      value: summary.rate !== null ? formatRatePercent(summary.rate) : "—",
      hint:
        summary.rate !== null
          ? t("deposit.savings.detail.figure.rate_hint")
          : t("deposit.savings.detail.figure.rate_none"),
    },
    maturityFigure(t, savings.maturity_date, summary.term, summary.active),
  ]
  return <KeyFigures items={items} />
}

/** Side column: book properties, then the approval trail of its case. */
export function SavingsAside({
  savings,
  summary,
}: {
  savings: Savings
  summary: SavingsSummary
}) {
  const { t } = useI18n()
  const date = (value?: string) => (value ? formatDateShort(value) : undefined)
  return (
    <>
      <PropertyList
        title={t("deposit.savings.detail.properties")}
        items={[
          { label: t("deposit.savings.field.customer"), value: savings.customer_code },
          { label: t("deposit.savings.field.product"), value: savings.product_code },
          { label: t("deposit.savings.field.open_date"), value: date(savings.open_date) },
          { label: t("deposit.savings.field.maturity_date"), value: date(savings.maturity_date) },
          {
            label: t("deposit.term.length"),
            value:
              summary.term.totalDays > 0
                ? t("deposit.term.days", { count: summary.term.totalDays })
                : undefined,
          },
          { label: t("deposit.savings.field.org"), value: savings.org_code },
          { label: t("common.field.currency"), value: savings.currency_code },
          { label: t("common.field.created"), value: date(savings.created_at) },
        ]}
      />
      {savings.workflow_case_id ? (
        <CaseApprovalSection caseId={savings.workflow_case_id} />
      ) : null}
    </>
  )
}
