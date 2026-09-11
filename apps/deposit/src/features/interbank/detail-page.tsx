import { useCallback, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import { depositApi, type IbmDetail, type IbmMovement } from "../api"
import { printVoucher } from "../../lib/print-voucher"
import { IbmMovementDialog } from "./components/IbmMovementDialog"

/** IBM contract detail: info + movements + staging actions. */
export function InterbankDetailPage() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const marker = "/deposit/interbank/"
  const idx = pathname.indexOf(marker)
  const depositID = idx >= 0 ? decodeURIComponent(pathname.slice(idx + marker.length).split("/")[0]) : ""

  const [detail, setDetail] = useState<IbmDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [movementKind, setMovementKind] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!depositID) return
    try {
      setDetail(await depositApi.getInterbank(depositID))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [depositID])

  useEffect(() => {
    void load()
  }, [load])

  const deposit = detail?.deposit
  const canStage = deposit?.status === "ACTIVE"

  const handlePrint = () => {
    if (!deposit) return
    const amount = (value: number) =>
      formatAmount(fromMinor(value, deposit.currency_code), deposit.currency_code)
    const ok = printVoucher({
      title: t("deposit.interbank.print.title"),
      subtitle: deposit.deposit_code,
      fields: [
        { label: t("deposit.interbank.field.counterparty"), value: `${deposit.counterparty_code}${deposit.counterparty_name ? ` — ${deposit.counterparty_name}` : ""}` },
        { label: t("deposit.interbank.field.product"), value: deposit.product_code ?? "—" },
        { label: t("deposit.interbank.field.principal"), value: amount(deposit.principal_minor) },
        { label: t("deposit.interbank.field.accrued"), value: amount(deposit.accrued_minor) },
        { label: t("deposit.interbank.field.interest_rate"), value: formatRatePercent(deposit.interest_rate) },
        { label: t("deposit.interbank.field.deposit_date"), value: formatDateShort(deposit.deposit_date) },
        { label: t("deposit.interbank.field.maturity_date"), value: formatDateShort(deposit.maturity_date) },
        { label: t("deposit.interbank.field.last_interest"), value: deposit.last_interest_date ? formatDateShort(deposit.last_interest_date) : "—" },
      ],
      table: {
        columns: [
          t("deposit.interbank.movement.field.kind"),
          t("deposit.interbank.movement.field.date"),
          t("deposit.interbank.movement.field.amount"),
          t("deposit.interbank.movement.field.note"),
          t("common.field.status"),
        ],
        rows: (detail?.movements ?? []).map((row) => [
          t(`deposit.interbank.movement_kind.${row.kind}`),
          formatDateShort(row.movement_date),
          amount(row.amount_minor),
          row.note || "—",
          t(`deposit.interbank.movement_status.${row.status}`),
        ]),
      },
      signatures: [
        t("deposit.interbank.print.maker"),
        t("deposit.interbank.print.checker"),
      ],
      footer: t("deposit.interbank.print.footer"),
    })
    if (!ok) notify.error(t("deposit.interbank.print.blocked"))
  }

  if (loadError) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("deposit.interbank.detail.load_failed")}{" "}
        <button type="button" className="text-primary hover:underline" onClick={() => void load()}>
          {t("common.action.retry")}
        </button>
      </div>
    )
  }
  if (!deposit) {
    return <div className="p-6 text-sm text-muted-foreground">{t("deposit.loading")}</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/deposit/interbank" className="text-xs font-medium text-primary hover:underline">
            ← {t("deposit.interbank.title")}
          </Link>
          <h1 className="font-mono text-lg font-semibold">{deposit.deposit_code}</h1>
          <Badge variant={deposit.status === "ACTIVE" ? "default" : "outline"}>
            {t(`deposit.interbank.status.${deposit.status}`)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            {t("deposit.interbank.action.print")}
          </Button>
          {canStage && (
            <>
              <Button size="sm" onClick={() => setMovementKind("TOP_UP")}>
                {t("deposit.interbank.action.top_up")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMovementKind("INTEREST")}>
                {t("deposit.interbank.action.interest")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMovementKind("EXPECTED")}>
                {t("deposit.interbank.action.expected")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMovementKind("WITHDRAW")}>
                {t("deposit.interbank.action.withdraw")}
              </Button>
            </>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border p-4 text-sm md:grid-cols-4">
        <Info label={t("deposit.interbank.field.counterparty")} value={`${deposit.counterparty_code}${deposit.counterparty_name ? ` — ${deposit.counterparty_name}` : ""}`} />
        <Info label={t("deposit.interbank.field.product")} value={deposit.product_code ?? "—"} />
        <Info label={t("deposit.interbank.field.principal")} value={formatAmount(fromMinor(deposit.principal_minor, deposit.currency_code), deposit.currency_code)} />
        <Info label={t("deposit.interbank.field.accrued")} value={formatAmount(fromMinor(deposit.accrued_minor, deposit.currency_code), deposit.currency_code)} />
        <Info label={t("deposit.interbank.field.interest_rate")} value={formatRatePercent(deposit.interest_rate)} />
        <Info label={t("deposit.interbank.field.deposit_date")} value={formatDateShort(deposit.deposit_date)} />
        <Info label={t("deposit.interbank.field.maturity_date")} value={formatDateShort(deposit.maturity_date)} />
        <Info label={t("deposit.interbank.field.last_interest")} value={deposit.last_interest_date ? formatDateShort(deposit.last_interest_date) : "—"} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("deposit.interbank.movement.title")}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("deposit.interbank.movement.field.kind")}</th>
                <th className="px-3 py-2">{t("deposit.interbank.movement.field.date")}</th>
                <th className="px-3 py-2 text-right">{t("deposit.interbank.movement.field.amount")}</th>
                <th className="px-3 py-2">{t("deposit.interbank.movement.field.note")}</th>
                <th className="px-3 py-2">{t("common.field.status")}</th>
              </tr>
            </thead>
            <tbody>
              {(detail?.movements ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    {t("deposit.interbank.movement.empty")}
                  </td>
                </tr>
              )}
              {(detail?.movements ?? []).map((row: IbmMovement) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">{t(`deposit.interbank.movement_kind.${row.kind}`)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.movement_date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.note || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        row.status === "POSTED"
                          ? "default"
                          : row.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {t(`deposit.interbank.movement_status.${row.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <IbmMovementDialog
        open={movementKind !== null}
        onOpenChange={(next) => !next && setMovementKind(null)}
        depositId={deposit.id}
        currencyCode={deposit.currency_code}
        defaultKind={movementKind ?? "TOP_UP"}
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
