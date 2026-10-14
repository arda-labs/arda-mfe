import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { CaseTabs, useCaseTabs } from "@workspace/case-tabs"
import { Button } from "@workspace/ui/components/button"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DocCode } from "@workspace/ui/components/doc-code"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { todayISO } from "@workspace/format"
import { depositApi, type SavingsDetail } from "../api"
import { InterestDialog } from "./components/InterestDialog"
import { savingsBusinessTabs } from "./components/savings-tabs"
import { SavingsAside, SavingsFigures, SavingsLifecycle } from "./components/SavingsOverview"
import { savingsLifecycle, summarizeSavings } from "./savings-summary"

const LIST_PATH = "/deposit"

/**
 * Savings detail (DPM.300 contract view) on DetailPageShell v2: book code and
 * status, lifecycle, key figures, properties + approval trail aside, then the
 * transactions / accruals / interest tabs and the case system tabs.
 */
export function SavingsDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
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
  const summary = useMemo(() => (detail ? summarizeSavings(detail, todayISO()) : null), [detail])
  // EPAS lib-bpm-tabs: business tabs first, then the system tabs. Files opened
  // with the savings book live on `dpm_savings` (open is a direct posting, no
  // case); settle/additional/interest staged files attach to the case — merge
  // both owners so the dossier shows every document.
  const systemTabs = useCaseTabs({
    caseId: savings?.workflow_case_id ?? undefined,
    attachmentEntities: savings
      ? [
          { type: "dpm_savings", id: savings.id, module: "deposit" },
          ...(savings.workflow_case_id
            ? [
                {
                  type: "business_case",
                  id: savings.workflow_case_id,
                  module: "workflow",
                },
              ]
            : []),
        ]
      : [],
    canUpload: false,
    showActivityLog: Boolean(savings?.workflow_case_id),
  })

  const backToList = () => navigate(LIST_PATH)

  if (loadError || !detail || !savings || !summary) {
    return (
      <DetailPageShell
        title={savingsCode || t("deposit.savings.title")}
        backLabel={t("deposit.savings.title")}
        onBack={backToList}
      >
        <div className="text-sm text-muted-foreground">
          {loadError ? (
            <>
              {t("deposit.savings.detail.load_failed")}{" "}
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

  const canOperateInterest = savings.status === "ACTIVE" && savings.accrued_minor > 0
  const life = savingsLifecycle(savings.status)

  return (
    <DetailPageShell
      title={savings.customer_code}
      docCode={<DocCode code={savings.savings_code} />}
      badges={
        <StatusBadge status={savings.status}>
          {t(`deposit.savings.status.${savings.status}`)}
        </StatusBadge>
      }
      backLabel={t("deposit.savings.title")}
      onBack={backToList}
      actions={
        canOperateInterest ? (
          <>
            <Button size="sm" onClick={() => setOpType("PAY")}>
              {t("deposit.interest.op_type.PAY")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpType("CAPITALIZE")}>
              {t("deposit.interest.op_type.CAPITALIZE")}
            </Button>
          </>
        ) : undefined
      }
      progress={life ? <SavingsLifecycle savings={savings} life={life} /> : undefined}
      keyFigures={<SavingsFigures savings={savings} summary={summary} />}
      aside={<SavingsAside savings={savings} summary={summary} />}
    >
      <CaseTabs tabs={[...savingsBusinessTabs(t, detail, savings), ...systemTabs]} />

      <InterestDialog
        open={opType !== null}
        onOpenChange={(next) => !next && setOpType(null)}
        savingsCode={savings.savings_code}
        accruedMinor={savings.accrued_minor}
        currencyCode={savings.currency_code}
        defaultOp={opType ?? "PAY"}
        onSaved={load}
      />
    </DetailPageShell>
  )
}
