import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { CaseTabs, useCaseTabs } from "@workspace/case-tabs"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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

  // EPAS CFM contract detail: business tabs first, then the system tabs. A
  // contract linked to a workflow case owns its case attachments; otherwise
  // files attach to the contract entity and there is no activity log.
  const systemTabs = useCaseTabs({
    caseId: contract?.workflow_case_id,
    attachmentEntity:
      contract && !contract.workflow_case_id
        ? { type: "cfc_contract", id: contract.id, module: "capital" }
        : undefined,
    canUpload: false,
    showActivityLog: Boolean(contract?.workflow_case_id),
  })

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

  const tabs = [
    {
      id: "info",
      label: t("capital.detail.tab.info"),
      content: (
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
      ),
    },
    {
      id: "movements",
      label: t("capital.detail.tab.movements"),
      content: (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("capital.movements.field.type")}</TableHead>
                <TableHead>{t("capital.movements.field.date")}</TableHead>
                <TableHead className="text-right">{t("capital.movements.field.amount")}</TableHead>
                <TableHead>{t("capital.movements.field.note")}</TableHead>
                <TableHead>{t("common.field.status")}</TableHead>
                <TableHead>{t("capital.field.journal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                    {t("capital.movements.empty")}
                  </TableCell>
                </TableRow>
              )}
              {movementRows.map((row: CapitalMovement) => (
                <TableRow key={row.id}>
                  <TableCell>{t(`capital.movement_type.${row.movement_type}`)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateShort(row.movement_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "POSTED" ? "default" : row.status === "REJECTED" ? "destructive" : "secondary"}>
                      {t(`capital.movement_status.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.journal_entry_id ? row.journal_entry_id.slice(0, 8) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      id: "amendments",
      label: t("capital.detail.tab.amendments"),
      content: (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("capital.amendments.field.reason")}</TableHead>
                <TableHead>{t("capital.amendments.field.payload")}</TableHead>
                <TableHead>{t("common.field.created")}</TableHead>
                <TableHead>{t("common.field.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amendmentRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                    {t("capital.amendments.empty")}
                  </TableCell>
                </TableRow>
              )}
              {amendmentRows.map((row: ContractAmendment) => (
                <TableRow key={row.id}>
                  <TableCell>{row.reason || "—"}</TableCell>
                  <TableCell className="max-w-[360px] truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(row.payload)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateShort(row.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "APPLIED" ? "default" : row.status === "REJECTED" ? "destructive" : "secondary"}>
                      {t(`capital.amendment_status.${row.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    ...systemTabs,
  ]

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

      <CaseTabs tabs={tabs} />

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
