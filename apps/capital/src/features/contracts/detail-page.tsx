import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import { capitalApi, type ContractDetail, type ContractAmendment, type CapitalMovement } from "../api"
import { MovementDialog } from "./components/MovementDialog"
import { AmendmentDialog } from "./components/AmendmentDialog"

function useContractID(): string {
  const { pathname } = useLocation()
  const marker = "/capital/contracts/"
  const idx = pathname.indexOf(marker)
  return idx >= 0 ? decodeURIComponent(pathname.slice(idx + marker.length).split("/")[0]) : ""
}

/** CFM contract detail: info + movements + amendments + staging actions. */
export function ContractDetailPage() {
  const { t } = useI18n()
  const contractID = useContractID()
  const [detail, setDetail] = useState<ContractDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [movementType, setMovementType] = useState<string | null>(null)
  const [amendmentOpen, setAmendmentOpen] = useState(false)

  const load = useCallback(async () => {
    if (!contractID) return
    try {
      setDetail(await capitalApi.getContract(contractID))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [contractID])

  useEffect(() => {
    void load()
  }, [load])

  const contract = detail?.contract
  const canStage = contract?.status === "ACTIVE"

  const movementRows = useMemo(() => detail?.movements ?? [], [detail])
  const amendmentRows = useMemo(() => detail?.amendments ?? [], [detail])

  if (loadError) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("capital.detail.load_failed")}{" "}
        <button type="button" className="text-primary hover:underline" onClick={() => void load()}>
          {t("common.action.retry")}
        </button>
      </div>
    )
  }
  if (!contract) {
    return <div className="p-6 text-sm text-muted-foreground">{t("capital.detail.loading")}</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/capital" className="text-xs font-medium text-primary hover:underline">
            ← {t("capital.contracts.title")}
          </Link>
          <h1 className="font-mono text-lg font-semibold">{contract.contract_code}</h1>
          <Badge variant={contract.status === "ACTIVE" ? "default" : "outline"}>
            {t(`capital.status.${contract.status}`)}
          </Badge>
        </div>
        {canStage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setMovementType("RECEIPT")}>
              {t("capital.action.receipt")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMovementType("DISBURSEMENT")}>
              {t("capital.action.disbursement")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMovementType("PAYMENT")}>
              {t("capital.action.payment")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMovementType("SETTLEMENT")}>
              {t("capital.action.settlement")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAmendmentOpen(true)}>
              {t("capital.action.amend")}
            </Button>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border p-4 text-sm md:grid-cols-4">
        <Info label={t("capital.contracts.field.fund_type")} value={`${contract.fund_type_code}${detail?.fund_type ? ` — ${detail.fund_type.name}` : ""}`} />
        <Info label={t("capital.contracts.field.product")} value={detail?.product?.name ?? contract.product_code ?? "—"} />
        <Info label={t("capital.contracts.field.counterparty")} value={contract.counterparty_code} />
        <Info label={t("capital.contracts.field.amount")} value={formatAmount(fromMinor(contract.amount_minor, contract.currency_code), contract.currency_code)} />
        <Info label={t("capital.contracts.field.interest_rate")} value={formatRatePercent(contract.interest_rate)} />
        <Info label={t("capital.contracts.field.contract_date")} value={formatDateShort(contract.contract_date)} />
        <Info label={t("capital.contracts.field.maturity_date")} value={contract.maturity_date ? formatDateShort(contract.maturity_date) : "—"} />
        <Info label={t("capital.contracts.field.org")} value={contract.org_code || "—"} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("capital.movements.title")}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("capital.movements.field.type")}</th>
                <th className="px-3 py-2">{t("capital.movements.field.date")}</th>
                <th className="px-3 py-2 text-right">{t("capital.movements.field.amount")}</th>
                <th className="px-3 py-2">{t("capital.movements.field.note")}</th>
                <th className="px-3 py-2">{t("common.field.status")}</th>
                <th className="px-3 py-2">{t("capital.field.journal")}</th>
              </tr>
            </thead>
            <tbody>
              {movementRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                    {t("capital.movements.empty")}
                  </td>
                </tr>
              )}
              {movementRows.map((row: CapitalMovement) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">{t(`capital.movement_type.${row.movement_type}`)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.movement_date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.note || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.status === "POSTED" ? "default" : row.status === "REJECTED" ? "destructive" : "secondary"}>
                      {t(`capital.movement_status.${row.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.journal_entry_id ? row.journal_entry_id.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("capital.amendments.title")}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("capital.amendments.field.reason")}</th>
                <th className="px-3 py-2">{t("capital.amendments.field.payload")}</th>
                <th className="px-3 py-2">{t("common.field.created")}</th>
                <th className="px-3 py-2">{t("common.field.status")}</th>
              </tr>
            </thead>
            <tbody>
              {amendmentRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    {t("capital.amendments.empty")}
                  </td>
                </tr>
              )}
              {amendmentRows.map((row: ContractAmendment) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">{row.reason || "—"}</td>
                  <td className="max-w-[360px] truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                    {JSON.stringify(row.payload)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.status === "APPLIED" ? "default" : row.status === "REJECTED" ? "destructive" : "secondary"}>
                      {t(`capital.amendment_status.${row.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MovementDialog
        open={movementType !== null}
        onOpenChange={(next) => !next && setMovementType(null)}
        contractId={contract.id}
        currencyCode={contract.currency_code}
        defaultType={movementType ?? "RECEIPT"}
        onSaved={load}
      />
      <AmendmentDialog
        open={amendmentOpen}
        onOpenChange={setAmendmentOpen}
        contractId={contract.id}
        currencyCode={contract.currency_code}
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
