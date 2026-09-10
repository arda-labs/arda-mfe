import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  formationApi,
  loanApi,
  type LoanContract,
  type LoanDossier,
} from "../../api"
import {
  DossierTabs,
  type DossierCollateral,
  type DossierMortgage,
} from "./components/dossier-tabs"

/**
 * Quản lý khoản vay — hồ sơ tổng hợp (EPAS `loan-management`): chọn hợp đồng
 * rồi xem toàn bộ dữ liệu liên quan (thuận từ, lịch trả nợ, giải ngân, thu nợ,
 * TSBĐ, case workflow). Read-only, dữ liệu từ GET /contracts/{id}/dossier.
 */
export function LoanDossierPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const contractId = searchParams.get("contractId") ?? ""
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [dossier, setDossier] = useState<LoanDossier | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingContracts(true)
    loanApi
      .listContracts({ per_page: 200 })
      .then((res) => {
        if (!cancelled) setContracts(res.items)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setContracts([])
          notify.error(translateApiError(error, t("loan.dossier.load_failed")))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContracts(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (!contractId) {
      setDossier(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    formationApi
      .getDossier(contractId)
      .then((res) => {
        if (!cancelled) setDossier(res)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDossier(null)
          setLoadError(true)
          notify.error(translateApiError(error, t("loan.dossier.load_failed")))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contractId, t])

  const mortgages = useMemo(
    () => (dossier?.mortgages ?? []) as DossierMortgage[],
    [dossier]
  )
  const collaterals = useMemo(
    () => (dossier?.collaterals ?? []) as DossierCollateral[],
    [dossier]
  )

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("loan.dossier.title")}
        description={t("loan.dossier.description")}
        meta={
          dossier ? (
            <Badge variant="secondary" className="shrink-0">
              {dossier.contract.contract_no ||
                dossier.contract.contract_code}{" "}
              — {dossier.contract.status}
            </Badge>
          ) : null
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="max-w-xl space-y-1.5">
          <Label htmlFor="dossier-contract">
            {t("loan.dossier.field.contract")}
          </Label>
          <Select
            value={contractId || undefined}
            onValueChange={(value) => setSearchParams({ contractId: value })}
            disabled={loadingContracts}
          >
            <SelectTrigger id="dossier-contract" className="w-full">
              <SelectValue
                placeholder={
                  loadingContracts
                    ? t("loan.dossier.loading")
                    : t("loan.dossier.placeholder.contract")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contractLabel(contract)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t("loan.dossier.load_failed")}
          </div>
        ) : null}

        {!contractId ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.dossier.pick_contract")}
          </div>
        ) : loading ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.dossier.loading")}
          </div>
        ) : dossier ? (
          <DossierTabs
            dossier={dossier}
            mortgages={mortgages}
            collaterals={collaterals}
          />
        ) : null}
      </div>
    </Page>
  )
}

function contractLabel(contract: LoanContract) {
  return [
    contract.contract_no || contract.contract_code,
    contract.customer_code,
    contract.status,
  ]
    .filter(Boolean)
    .join(" — ")
}
