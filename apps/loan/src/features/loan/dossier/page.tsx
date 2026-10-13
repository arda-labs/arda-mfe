import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { FileSearch } from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DocCode } from "@workspace/ui/components/doc-code"
import { KeyFigures, type KeyFigure } from "@workspace/ui/components/key-figures"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"
import { PropertyList } from "@workspace/ui/components/property-list"
import { SelectField } from "@workspace/ui/components/select-field"
import {
  formatDateShort,
  formatMoney,
  formatRatePercent,
  fromMinor,
  todayISO,
} from "@workspace/format"
import {
  formationApi,
  loanApi,
  type LoanContract,
  type LoanDossier,
} from "../../api"
import { contractStatusLabel } from "../contract-status"
import {
  DossierTabs,
  type DossierCollateral,
  type DossierMortgage,
} from "./components/dossier-tabs"
import { dossierLifecycle, summarizeDossier } from "./dossier-summary"
import { StatusBadge } from "@workspace/ui/components/status-badge"

/**
 * Quản lý khoản vay — hồ sơ tổng hợp (EPAS `loan-management`): chọn hợp đồng
 * rồi xem toàn bộ dữ liệu liên quan (khế ước, lịch trả nợ, giải ngân, thu nợ,
 * TSBĐ, case workflow). Read-only, dữ liệu từ GET /contracts/{id}/dossier.
 * Bố cục DetailPageShell v2: mã chứng từ, vòng đời, số liệu chính, cột thuộc tính.
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

  const contractOptions = useMemo(
    () =>
      contracts.map((contract) => ({
        value: contract.id,
        code: contract.contract_no || contract.contract_code,
        label: contract.customer_code,
        hint: contractStatusLabel(contract.status, t),
      })),
    [contracts, t]
  )
  const mortgages = useMemo(
    () => (dossier?.mortgages ?? []) as DossierMortgage[],
    [dossier]
  )
  const collaterals = useMemo(
    () => (dossier?.collaterals ?? []) as DossierCollateral[],
    [dossier]
  )

  const picker = (
    <SelectField
      aria-label={t("loan.dossier.field.contract")}
      className="w-full sm:w-[26rem]"
      value={contractId}
      options={contractOptions}
      searchable
      clearable={false}
      disabled={loadingContracts}
      placeholder={
        loadingContracts
          ? t("loan.dossier.loading")
          : t("loan.dossier.placeholder.contract")
      }
      onChange={(event) =>
        setSearchParams(
          event.target.value ? { contractId: event.target.value } : {}
        )
      }
    />
  )

  const contract = dossier?.contract
  return (
    <DetailPageShell
      title={contract ? contract.customer_code : t("loan.dossier.title")}
      subtitle={contract ? undefined : t("loan.dossier.description")}
      docCode={
        contract ? (
          <DocCode code={contract.contract_no || contract.contract_code} />
        ) : undefined
      }
      badges={
        contract ? (
          <StatusBadge status={contract.status}>
            {contractStatusLabel(contract.status, t)}
          </StatusBadge>
        ) : undefined
      }
      actions={picker}
      progress={dossier ? <DossierLifecycle dossier={dossier} /> : undefined}
      keyFigures={dossier ? <DossierFigures dossier={dossier} /> : undefined}
      aside={contract ? <ContractProperties contract={contract} /> : undefined}
    >
      {loadError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("loan.dossier.load_failed")}
        </div>
      ) : null}
      {!contractId ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
          <FileSearch aria-hidden className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("loan.dossier.pick_contract")}
          </p>
        </div>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("loan.dossier.loading")}
        </p>
      ) : dossier ? (
        <DossierTabs
          dossier={dossier}
          mortgages={mortgages}
          collaterals={collaterals}
        />
      ) : null}
    </DetailPageShell>
  )
}

function DossierLifecycle({ dossier }: { dossier: LoanDossier }) {
  const { t } = useI18n()
  const summary = summarizeDossier(dossier, todayISO())
  const life = dossierLifecycle(summary)
  const signed = dossier.contract.contract_date
  return (
    <LifecycleSteps
      label={t("loan.dossier.lifecycle.label")}
      steps={[
        {
          id: "signed",
          label: t("loan.dossier.lifecycle.signed"),
          state: "done",
          meta: signed ? formatDateShort(signed) : undefined,
        },
        {
          id: "disbursement",
          label: t("loan.dossier.lifecycle.disbursement"),
          state: life.disbursement,
          meta: summary.disbursementCount
            ? t("loan.dossier.lifecycle.batches", {
                count: summary.disbursementCount,
              })
            : undefined,
        },
        {
          id: "repayment",
          label: t("loan.dossier.lifecycle.repayment"),
          state: life.repayment,
          meta: summary.totalTerms
            ? `${summary.paidTerms}/${summary.totalTerms}`
            : undefined,
        },
        {
          id: "settled",
          label: t("loan.dossier.lifecycle.settled"),
          state: life.settled,
        },
      ]}
    />
  )
}

function DossierFigures({ dossier }: { dossier: LoanDossier }) {
  const { t } = useI18n()
  const summary = summarizeDossier(dossier, todayISO())
  const money = (minor: number) => formatMoney(fromMinor(minor))
  const items: KeyFigure[] = [
    { label: t("loan.dossier.figure.limit"), value: money(summary.limitMinor) },
    {
      label: t("loan.dossier.figure.disbursed"),
      value: money(summary.disbursedMinor),
      progress:
        summary.limitMinor > 0
          ? summary.disbursedMinor / summary.limitMinor
          : undefined,
    },
    {
      label: t("loan.dossier.figure.outstanding"),
      value: money(summary.outstandingMinor),
      hint: t("loan.dossier.figure.collected", {
        amount: money(summary.principalCollectedMinor),
      }),
    },
    {
      label: t("loan.dossier.figure.next_due"),
      value: summary.nextDue ? formatDateShort(summary.nextDue.date) : "—",
      hint: summary.nextDue
        ? t("loan.dossier.figure.next_due_hint", {
            term: summary.nextDue.termNo,
            amount: money(summary.nextDue.amountMinor),
          })
        : undefined,
    },
    {
      label: t("loan.dossier.figure.overdue"),
      value: t("loan.dossier.figure.overdue_terms", {
        count: summary.overdueTerms,
      }),
      tone: summary.overdueTerms > 0 ? "danger" : "success",
    },
  ]
  return <KeyFigures items={items} />
}

function ContractProperties({ contract }: { contract: LoanContract }) {
  const { t } = useI18n()
  const date = (value?: string) => (value ? formatDateShort(value) : undefined)
  return (
    <PropertyList
      title={t("loan.dossier.properties")}
      items={[
        { label: t("loan.dossier.field.customer"), value: contract.customer_code },
        { label: t("loan.dossier.field.product"), value: contract.product_code },
        {
          label: t("loan.dossier.field.interest"),
          value:
            contract.interest_rate != null
              ? formatRatePercent(contract.interest_rate)
              : undefined,
        },
        {
          label: t("loan.dossier.field.term"),
          value: contract.loan_term
            ? `${contract.loan_term} ${contract.term_unit ?? ""}`.trim()
            : undefined,
        },
        { label: t("loan.dossier.field.contract_date"), value: date(contract.contract_date) },
        { label: t("loan.dossier.field.maturity"), value: date(contract.maturity_date) },
        { label: t("loan.dossier.field.officer"), value: contract.employee_code },
        { label: t("loan.dossier.field.unit"), value: contract.org_code },
        { label: t("loan.dossier.field.case"), value: contract.workflow_case_code },
      ]}
    />
  )
}
