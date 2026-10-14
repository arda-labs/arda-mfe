import { useI18n } from "@workspace/i18n"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"
import { KeyFigures, type KeyFigure } from "@workspace/ui/components/key-figures"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"
import { PropertyList } from "@workspace/ui/components/property-list"
import {
  formatAmount,
  formatDateShort,
  formatRatePercent,
  fromMinor,
  todayISO,
} from "@workspace/format"
import type { ContractDetail } from "../../api"
import {
  contractLifecycle,
  maturityTone,
  summarizeContract,
} from "../contract-summary"

/** Lập HĐ → Phê duyệt → Hiệu lực → Tất toán, from the contract status. */
export function ContractLifecycle({ detail }: { detail: ContractDetail }) {
  const { t } = useI18n()
  const { contract } = detail
  const life = contractLifecycle(contract.status)
  const summary = summarizeContract(detail, todayISO())
  return (
    <LifecycleSteps
      label={t("capital.detail.lifecycle.label")}
      steps={[
        {
          id: "created",
          label: t("capital.detail.lifecycle.created"),
          state: "done",
          meta: formatDateShort(contract.contract_date),
        },
        {
          id: "approval",
          label: life.rejected
            ? t("capital.status.REJECTED")
            : t("capital.detail.lifecycle.approval"),
          state: life.approval,
        },
        {
          id: "active",
          label: t("capital.detail.lifecycle.active"),
          state: life.active,
          meta: summary.postedCount
            ? t("capital.detail.lifecycle.movements", {
                count: summary.postedCount,
              })
            : undefined,
        },
        {
          id: "settled",
          label: t("capital.detail.lifecycle.settled"),
          state: life.settled,
          meta: summary.settledOn ? formatDateShort(summary.settledOn) : undefined,
        },
      ]}
    />
  )
}

/** Số vốn, đã tiếp nhận, số dư khả dụng, lãi suất, đáo hạn. */
export function ContractFigures({ detail }: { detail: ContractDetail }) {
  const { t } = useI18n()
  const { contract } = detail
  const summary = summarizeContract(detail, todayISO())
  const money = (minor: number) =>
    formatAmount(fromMinor(minor, contract.currency_code), contract.currency_code)
  const days = summary.daysToMaturity
  const maturityHint =
    days === null || contract.status !== "ACTIVE"
      ? undefined
      : days < 0
        ? t("capital.detail.figure.overdue_days", { count: -days })
        : days === 0
          ? t("capital.detail.figure.due_today")
          : t("capital.detail.figure.days_left", { count: days })
  const items: KeyFigure[] = [
    { label: t("capital.contracts.field.amount"), value: money(summary.amountMinor) },
    {
      label: t("capital.detail.figure.received"),
      value: money(summary.receivedMinor),
      progress:
        summary.amountMinor > 0
          ? summary.receivedMinor / summary.amountMinor
          : undefined,
      hint: summary.pendingCount
        ? t("capital.detail.figure.pending", { count: summary.pendingCount })
        : undefined,
    },
    {
      label: t("capital.detail.figure.available"),
      value: money(summary.availableMinor),
      hint: t("capital.detail.figure.outflow", {
        amount: money(summary.outflowMinor),
      }),
    },
    {
      label: t("capital.contracts.field.interest_rate"),
      value: formatRatePercent(contract.interest_rate),
    },
    {
      label: t("capital.contracts.field.maturity_date"),
      value: contract.maturity_date ? formatDateShort(contract.maturity_date) : "—",
      hint: maturityHint,
      tone: maturityTone(contract.status, days),
    },
  ]
  return <KeyFigures items={items} />
}

/** Right column: contract properties + approval trail of its workflow case. */
export function ContractAside({ detail }: { detail: ContractDetail }) {
  const { t } = useI18n()
  const { contract } = detail
  const fundType = detail.fund_type
    ? `${contract.fund_type_code} — ${detail.fund_type.name}`
    : contract.fund_type_code
  return (
    <>
      <PropertyList
        title={t("capital.detail.properties")}
        items={[
          { label: t("capital.contracts.field.counterparty"), value: contract.counterparty_code },
          { label: t("capital.contracts.field.fund_type"), value: fundType },
          {
            label: t("capital.contracts.field.product"),
            value: detail.product?.name ?? contract.product_code,
          },
          { label: t("common.field.currency"), value: contract.currency_code },
          {
            label: t("capital.contracts.field.contract_date"),
            value: formatDateShort(contract.contract_date),
          },
          {
            label: t("capital.contracts.field.maturity_date"),
            value: contract.maturity_date
              ? formatDateShort(contract.maturity_date)
              : undefined,
          },
          { label: t("capital.contracts.field.org"), value: contract.org_code },
          {
            label: t("capital.field.journal"),
            value: contract.journal_entry_id ? (
              <span className="font-mono text-xs">
                {contract.journal_entry_id.slice(0, 8)}
              </span>
            ) : undefined,
          },
          {
            label: t("common.field.created"),
            value: contract.created_at
              ? formatDateShort(contract.created_at)
              : undefined,
          },
        ]}
      />
      {contract.workflow_case_id ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("common.approval.label")}
          </h2>
          <CaseApprovalTrail
            caseId={contract.workflow_case_id}
            finalLabel={t("capital.detail.lifecycle.active")}
          />
        </section>
      ) : null}
    </>
  )
}
