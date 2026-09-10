import { useCallback, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import {
  depositApi,
  type Accrual,
  type DepositTxnLike,
  type InterestOp,
  type SavingsDetail,
} from "../api"
import { InterestDialog } from "./components/InterestDialog"

/** Savings detail (DPM.300 contract view): info + txns + accruals + ops. */
export function SavingsDetailPage() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const marker = "/deposit/savings/"
  const idx = pathname.indexOf(marker)
  const savingsCode = idx >= 0 ? decodeURIComponent(pathname.slice(idx + marker.length).split("/")[0]) : ""

  const [detail, setDetail] = useState<SavingsDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [opType, setOpType] = useState<"PAY" | "CAPITALIZE" | null>(null)

  const load = useCallback(async () => {
    if (!savingsCode) return
    try {
      setDetail(await depositApi.getSavings(savingsCode))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [savingsCode])

  useEffect(() => {
    void load()
  }, [load])

  const savings = detail?.savings

  if (loadError) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("deposit.savings.detail.load_failed")}{" "}
        <button type="button" className="text-primary hover:underline" onClick={() => void load()}>
          {t("common.action.retry")}
        </button>
      </div>
    )
  }
  if (!savings) {
    return <div className="p-6 text-sm text-muted-foreground">{t("deposit.loading")}</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/deposit" className="text-xs font-medium text-primary hover:underline">
            ← {t("deposit.savings.title")}
          </Link>
          <h1 className="font-mono text-lg font-semibold">{savings.savings_code}</h1>
          <Badge variant={savings.status === "ACTIVE" ? "default" : "outline"}>
            {savings.status}
          </Badge>
        </div>
        {savings.status === "ACTIVE" && savings.accrued_minor > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setOpType("PAY")}>
              {t("deposit.interest.op_type.PAY")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpType("CAPITALIZE")}>
              {t("deposit.interest.op_type.CAPITALIZE")}
            </Button>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border p-4 text-sm md:grid-cols-4">
        <Info label={t("deposit.savings.field.customer")} value={savings.customer_code} />
        <Info label={t("deposit.products.title")} value={savings.product_code} />
        <Info
          label={t("deposit.savings.field.principal")}
          value={formatAmount(fromMinor(savings.principal_minor, savings.currency_code), savings.currency_code)}
        />
        <Info
          label={t("deposit.savings.field.accrued")}
          value={formatAmount(fromMinor(savings.accrued_minor, savings.currency_code), savings.currency_code)}
        />
        <Info label={t("deposit.savings.field.open_date")} value={formatDateShort(savings.open_date)} />
        <Info
          label={t("deposit.savings.field.maturity_date")}
          value={formatDateShort(savings.maturity_date)}
        />
        <Info label={t("deposit.savings.field.org")} value={savings.org_code || "—"} />
      </section>

      <Section title={t("deposit.savings.tab.transactions")}>
        <Table
          headers={[
            t("deposit.savings.txn.type"),
            t("deposit.savings.txn.date"),
            t("deposit.savings.txn.amount"),
            t("common.field.status"),
          ]}
          empty={t("deposit.savings.txn.empty")}
          rows={(detail?.transactions ?? []).map((row: DepositTxnLike) => [
            row.txn_type,
            formatDateShort(row.txn_date),
            formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code),
            row.status,
          ])}
        />
      </Section>

      <Section title={t("deposit.savings.tab.accruals")}>
        <Table
          headers={[
            t("deposit.rates.field.effective_from"),
            t("deposit.savings.accrual.period_to"),
            t("deposit.savings.accrual.days"),
            t("deposit.savings.accrual.amount"),
          ]}
          empty={t("deposit.savings.accrual.empty")}
          rows={(detail?.accruals ?? []).map((row: Accrual) => [
            formatDateShort(row.period_from),
            formatDateShort(row.period_to),
            String(row.days),
            formatAmount(fromMinor(row.amount_minor, savings.currency_code), savings.currency_code),
          ])}
        />
      </Section>

      <Section title={t("deposit.savings.tab.interest")}>
        <Table
          headers={[
            t("deposit.interest.field.op_type"),
            t("deposit.interest.field.amount"),
            t("common.field.created"),
            t("common.field.status"),
          ]}
          empty={t("deposit.savings.interest.empty")}
          rows={(detail?.interest_ops ?? []).map((row: InterestOp) => [
            t(`deposit.interest.op_type.${row.op_type}`),
            formatAmount(fromMinor(row.amount_minor, savings.currency_code), savings.currency_code),
            formatDateShort(row.created_at),
            row.status,
          ])}
        />
      </Section>

      <InterestDialog
        open={opType !== null}
        onOpenChange={(next) => !next && setOpType(null)}
        savingsCode={savings.savings_code}
        accruedMinor={savings.accrued_minor}
        currencyCode={savings.currency_code}
        defaultOp={opType ?? "PAY"}
        onSaved={load}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-border">{children}</div>
    </section>
  )
}

function Table({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
        <tr>
          {headers.map((header) => (
            <th key={header} className="px-3 py-2">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} className="px-3 py-4 text-center text-muted-foreground">
              {empty}
            </td>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={idx} className="border-t border-border">
            {row.map((cell, cellIdx) => (
              <td key={cellIdx} className="px-3 py-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
