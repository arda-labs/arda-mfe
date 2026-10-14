import { useI18n } from "@workspace/i18n"
import { KeyFigures, type KeyFigure } from "@workspace/ui/components/key-figures"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"
import { PropertyList } from "@workspace/ui/components/property-list"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import type { InterbankDeposit } from "../../api"
import { maturityFigure } from "../../../lib/maturity-figure"
import { CaseApprovalSection } from "../../shared/CaseApprovalSection"
import type { InterbankLifecycleStates, InterbankSummary } from "../interbank-summary"

/** Trình duyệt → Phê duyệt → Hiệu lực (header progress). */
export function IbmLifecycle({
  deposit,
  life,
}: {
  deposit: InterbankDeposit
  life: InterbankLifecycleStates
}) {
  const { t } = useI18n()
  return (
    <LifecycleSteps
      label={t("deposit.interbank.detail.lifecycle.label")}
      steps={[
        {
          id: "submitted",
          label: t("deposit.interbank.detail.lifecycle.submitted"),
          state: life.submitted,
          meta: deposit.created_at ? formatDateShort(deposit.created_at) : undefined,
        },
        {
          id: "approved",
          label: t("deposit.interbank.detail.lifecycle.approved"),
          state: life.approved,
        },
        {
          id: "effective",
          label: t("deposit.interbank.detail.lifecycle.effective"),
          state: life.effective,
          meta: deposit.maturity_date
            ? t("deposit.interbank.detail.lifecycle.until", {
                date: formatDateShort(deposit.maturity_date),
              })
            : undefined,
        },
      ]}
    />
  )
}

export function IbmFigures({
  deposit,
  summary,
}: {
  deposit: InterbankDeposit
  summary: InterbankSummary
}) {
  const { t } = useI18n()
  const money = (minor: number) =>
    formatAmount(fromMinor(minor, summary.currencyCode), summary.currencyCode)
  const items: KeyFigure[] = [
    {
      label: t("deposit.interbank.field.principal"),
      value: money(summary.principalMinor),
      hint:
        summary.toppedUpMinor > 0 || summary.withdrawnMinor > 0
          ? t("deposit.interbank.detail.figure.flows", {
              topUp: money(summary.toppedUpMinor),
              withdrawn: money(summary.withdrawnMinor),
            })
          : undefined,
    },
    {
      label: t("deposit.interbank.field.interest_rate"),
      value: formatRatePercent(summary.rate),
    },
    {
      label: t("deposit.interbank.field.accrued"),
      value: money(summary.accruedMinor),
      hint:
        summary.interestCollectedMinor > 0
          ? t("deposit.interbank.detail.figure.collected", {
              amount: money(summary.interestCollectedMinor),
            })
          : undefined,
    },
    maturityFigure(t, deposit.maturity_date, summary.term, summary.active),
    {
      label: t("deposit.interbank.detail.figure.pending"),
      value: String(summary.pendingMovements),
      hint: t("deposit.interbank.detail.figure.pending_hint"),
      tone: summary.pendingMovements > 0 ? "warning" : undefined,
    },
  ]
  return <KeyFigures items={items} />
}

/** Side column: contract properties, then the approval trail of its case. */
export function IbmAside({
  deposit,
  summary,
}: {
  deposit: InterbankDeposit
  summary: InterbankSummary
}) {
  const { t } = useI18n()
  const date = (value?: string) => (value ? formatDateShort(value) : undefined)
  return (
    <>
      <PropertyList
        title={t("deposit.interbank.detail.properties")}
        items={[
          { label: t("deposit.interbank.field.counterparty"), value: deposit.counterparty_code },
          { label: t("deposit.interbank.field.counterparty_name"), value: deposit.counterparty_name },
          { label: t("deposit.interbank.field.product"), value: deposit.product_code },
          { label: t("deposit.interbank.field.deposit_date"), value: date(deposit.deposit_date) },
          { label: t("deposit.interbank.field.maturity_date"), value: date(deposit.maturity_date) },
          {
            label: t("deposit.term.length"),
            value:
              summary.term.totalDays > 0
                ? t("deposit.term.days", { count: summary.term.totalDays })
                : undefined,
          },
          { label: t("deposit.interbank.field.last_interest"), value: date(deposit.last_interest_date) },
          { label: t("deposit.savings.field.org"), value: deposit.org_code },
          { label: t("common.field.currency"), value: deposit.currency_code },
        ]}
      />
      {deposit.workflow_case_id ? (
        <CaseApprovalSection caseId={deposit.workflow_case_id} />
      ) : null}
    </>
  )
}
