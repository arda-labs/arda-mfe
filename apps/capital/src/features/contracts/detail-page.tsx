import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { CaseTabs, useCaseTabs } from "@workspace/case-tabs"
import { Button } from "@workspace/ui/components/button"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DocCode } from "@workspace/ui/components/doc-code"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { capitalApi, type ContractDetail } from "../api"
import { MovementDialog } from "./components/MovementDialog"
import { AmendmentDialog } from "./components/AmendmentDialog"
import {
  ContractAside,
  ContractFigures,
  ContractLifecycle,
} from "./components/contract-overview"
import { AmendmentsTable, MovementsTable } from "./components/contract-tables"

const CONTRACTS_LIST_PATH = "/capital"

function useContractID(): string {
  const { pathname } = useLocation()
  const marker = "/capital/contracts/"
  const idx = pathname.indexOf(marker)
  return idx >= 0 ? decodeURIComponent(pathname.slice(idx + marker.length).split("/")[0]) : ""
}

/**
 * CFM contract detail on DetailPageShell v2: mã HĐ + trạng thái, vòng đời,
 * số liệu chính (từ payload chi tiết), cột thuộc tính + luồng phê duyệt,
 * tab giao dịch / điều chỉnh / hồ sơ; thao tác staging khi HĐ đang hiệu lực.
 */
export function ContractDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
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

  const backLabel = t("capital.contracts.title")
  const onBack = () => navigate(CONTRACTS_LIST_PATH)

  if (loadError || !detail || !contract) {
    return (
      <DetailPageShell title={backLabel} backLabel={backLabel} onBack={onBack}>
        {loadError ? (
          <p className="text-sm text-muted-foreground">
            {t("capital.detail.load_failed")}{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => void load()}>
              {t("common.action.retry")}
            </button>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("capital.detail.loading")}</p>
        )}
      </DetailPageShell>
    )
  }

  const tabs = [
    {
      id: "movements",
      label: t("capital.detail.tab.movements"),
      content: <MovementsTable rows={movementRows} />,
    },
    {
      id: "amendments",
      label: t("capital.detail.tab.amendments"),
      content: <AmendmentsTable rows={amendmentRows} />,
    },
    ...systemTabs,
  ]

  const subtitle = [detail.fund_type?.name ?? contract.fund_type_code, detail.product?.name]
    .filter(Boolean)
    .join(" · ")

  return (
    <>
      <DetailPageShell
        title={contract.counterparty_code}
        subtitle={subtitle || undefined}
        docCode={<DocCode code={contract.contract_code} />}
        badges={
          <StatusBadge status={contract.status}>
            {t(`capital.status.${contract.status}`)}
          </StatusBadge>
        }
        backLabel={backLabel}
        onBack={onBack}
        actions={
          canStage ? (
            <>
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
            </>
          ) : undefined
        }
        progress={<ContractLifecycle detail={detail} />}
        keyFigures={<ContractFigures detail={detail} />}
        aside={<ContractAside detail={detail} />}
      >
        <CaseTabs tabs={tabs} />
      </DetailPageShell>

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
    </>
  )
}
