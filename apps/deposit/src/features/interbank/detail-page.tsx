import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { CaseTabs, useCaseTabs } from "@workspace/case-tabs"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DocCode } from "@workspace/ui/components/doc-code"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor, todayISO } from "@workspace/format"
import { depositApi, type IbmDetail } from "../api"
import { printVoucher } from "../../lib/print-voucher"
import { IbmMovementDialog } from "./components/IbmMovementDialog"
import { IbmMovementsTable } from "./components/IbmMovementsTable"
import { IbmAside, IbmFigures, IbmLifecycle } from "./components/IbmOverview"
import { interbankLifecycle, summarizeInterbank } from "./interbank-summary"

const LIST_PATH = "/deposit/interbank"

/**
 * IBM placement detail on DetailPageShell v2: contract code and status,
 * lifecycle, key figures, properties + approval trail aside, then the
 * movements tab, the case system tabs and the staging actions.
 */
export function InterbankDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
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
  const summary = useMemo(() => (detail ? summarizeInterbank(detail, todayISO()) : null), [detail])
  const canStage = deposit?.status === "ACTIVE"
  // EPAS lib-bpm-tabs: business tabs first, then the system tabs. A contract
  // linked to a workflow case owns its case attachments; otherwise files attach
  // to the interbank deposit entity and there is no activity log.
  const systemTabs = useCaseTabs({
    caseId: deposit?.workflow_case_id ?? undefined,
    attachmentEntity:
      deposit && !deposit.workflow_case_id
        ? { type: "ibm_deposit", id: deposit.id, module: "deposit" }
        : undefined,
    canUpload: false,
    showActivityLog: Boolean(deposit?.workflow_case_id),
  })

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

  const backToList = () => navigate(LIST_PATH)

  if (loadError || !detail || !deposit || !summary) {
    return (
      <DetailPageShell
        title={t("deposit.interbank.title")}
        backLabel={t("deposit.interbank.title")}
        onBack={backToList}
      >
        <div className="text-sm text-muted-foreground">
          {loadError ? (
            <>
              {t("deposit.interbank.detail.load_failed")}{" "}
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void load()}>
                {t("common.action.retry")}
              </Button>
            </>
          ) : (
            t("deposit.loading")
          )}
        </div>
      </DetailPageShell>
    )
  }

  const life = interbankLifecycle(deposit.status)
  const tabs = [
    {
      id: "movements",
      label: t("deposit.interbank.movement.title"),
      content: <IbmMovementsTable movements={detail.movements ?? []} />,
    },
    ...systemTabs,
  ]

  return (
    <DetailPageShell
      title={deposit.counterparty_name || deposit.counterparty_code}
      subtitle={deposit.counterparty_name ? deposit.counterparty_code : undefined}
      docCode={<DocCode code={deposit.deposit_code} />}
      badges={
        <StatusBadge status={deposit.status}>
          {t(`deposit.interbank.status.${deposit.status}`)}
        </StatusBadge>
      }
      backLabel={t("deposit.interbank.title")}
      onBack={backToList}
      actions={
        <>
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
        </>
      }
      progress={life ? <IbmLifecycle deposit={deposit} life={life} /> : undefined}
      keyFigures={<IbmFigures deposit={deposit} summary={summary} />}
      aside={<IbmAside deposit={deposit} summary={summary} />}
    >
      <CaseTabs tabs={tabs} />

      <IbmMovementDialog
        open={movementKind !== null}
        onOpenChange={(next) => !next && setMovementKind(null)}
        depositId={deposit.id}
        currencyCode={deposit.currency_code}
        defaultKind={movementKind ?? "TOP_UP"}
        onSaved={load}
      />
    </DetailPageShell>
  )
}
