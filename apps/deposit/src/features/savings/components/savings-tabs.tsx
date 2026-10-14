import type { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import type {
  Accrual,
  DepositTxnLike,
  InterestOp,
  Savings,
  SavingsDetail,
} from "../../api"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { DetailTable } from "./DetailTable"

type Translate = ReturnType<typeof useI18n>["t"]

/** deposit-service txn_type (OPEN, DEPOSIT, TOP_UP, WITHDRAW, SETTLE, INTEREST); unknown codes stay raw. */
function txnTypeLabel(t: Translate, code: string) {
  const key = `deposit.savings.txn_type.${code}`
  const label = t(key)
  return label === key ? code : label
}

/**
 * Business tabs of a savings book (EPAS lib-bpm-tabs order: these first, then
 * the system tabs): transactions, accruals, interest operations.
 */
export function savingsBusinessTabs(
  t: Translate,
  detail: SavingsDetail,
  savings: Savings
) {
  const money = (minor: number, currency = savings.currency_code) =>
    formatAmount(fromMinor(minor, currency), currency)
  return [
    {
      id: "transactions",
      label: t("deposit.savings.tab.transactions"),
      content: (
        <DetailTable
          headers={[
            t("deposit.savings.txn.type"),
            t("deposit.savings.txn.date"),
            t("deposit.savings.txn.amount"),
            t("common.field.status"),
          ]}
          empty={t("deposit.savings.txn.empty")}
          rows={(detail.transactions ?? []).map((row: DepositTxnLike) => [
            txnTypeLabel(t, row.txn_type),
            formatDateShort(row.txn_date),
            money(row.amount_minor, row.currency_code),
            <StatusBadge key="status" status={row.status} />,
          ])}
        />
      ),
    },
    {
      id: "accruals",
      label: t("deposit.savings.tab.accruals"),
      content: (
        <DetailTable
          headers={[
            t("deposit.rates.field.effective_from"),
            t("deposit.savings.accrual.period_to"),
            t("deposit.savings.accrual.days"),
            t("deposit.savings.accrual.amount"),
          ]}
          empty={t("deposit.savings.accrual.empty")}
          rows={(detail.accruals ?? []).map((row: Accrual) => [
            formatDateShort(row.period_from),
            formatDateShort(row.period_to),
            String(row.days),
            money(row.amount_minor),
          ])}
        />
      ),
    },
    {
      id: "interest",
      label: t("deposit.savings.tab.interest"),
      content: (
        <DetailTable
          headers={[
            t("deposit.interest.field.op_type"),
            t("deposit.interest.field.amount"),
            t("common.field.created"),
            t("common.field.status"),
          ]}
          empty={t("deposit.savings.interest.empty")}
          rows={(detail.interest_ops ?? []).map((row: InterestOp) => [
            t(`deposit.interest.op_type.${row.op_type}`),
            money(row.amount_minor),
            formatDateShort(row.created_at),
            <StatusBadge key="status" status={row.status} />,
          ])}
        />
      ),
    },
  ]
}
