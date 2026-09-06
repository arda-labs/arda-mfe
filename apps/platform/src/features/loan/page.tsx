import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { translateApiError } from "@workspace/i18n"
import {
  loanAdjustmentKinds,
  loanApi,
  type LoanAdjustment,
  type LoanAdjustmentKind,
  type LoanContract,
} from "../api"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "default"
    case "PENDING":
    case "DRAFT":
      return "secondary"
    case "REJECTED":
    case "CANCELLED":
      return "destructive"
    default:
      return "outline"
  }
}

export function LoanPage() {
  const { t } = useI18n()
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const [kind, setKind] = useState<LoanAdjustmentKind>("debt-change")
  const [adjustments, setAdjustments] = useState<LoanAdjustment[]>([])
  const [loadingAdjustments, setLoadingAdjustments] = useState(false)
  const [submittingAdjustmentId, setSubmittingAdjustmentId] = useState<string | null>(null)

  const loadContracts = useCallback(async () => {
    setLoadingContracts(true)
    try {
      const result = await loanApi.listContracts()
      setContracts(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan.load_failed")))
    } finally {
      setLoadingContracts(false)
    }
  }, [t])

  const loadAdjustments = useCallback(async () => {
    setLoadingAdjustments(true)
    try {
      const result = await loanApi.listAdjustments(kind)
      setAdjustments(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan.load_failed")))
    } finally {
      setLoadingAdjustments(false)
    }
  }, [kind, t])

  useEffect(() => {
    void loadContracts()
  }, [loadContracts])

  useEffect(() => {
    void loadAdjustments()
  }, [loadAdjustments])

  const submitContract = async (contract: LoanContract) => {
    setSubmittingId(contract.id)
    try {
      await loanApi.submitContract(contract.id)
      notify.success(t("loan.submitted"))
      await loadContracts()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    } finally {
      setSubmittingId(null)
    }
  }

  const submitAdjustment = async (adjustment: LoanAdjustment) => {
    setSubmittingAdjustmentId(adjustment.id)
    try {
      await loanApi.submitAdjustment(kind, adjustment.id)
      notify.success(t("loan.submitted"))
      await loadAdjustments()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    } finally {
      setSubmittingAdjustmentId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("loan.title")} description={t("loan.description")} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("loan.contracts_title")}</h2>
        {loadingContracts ? (
          <p className="text-sm text-muted-foreground">{t("loan.loading")}</p>
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loan.field.contract_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.customer")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.status")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-[13px]">{contract.contract_code}</td>
                    <td className="px-3 py-2">{contract.customer_code}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {new Intl.NumberFormat("vi-VN").format(contract.loan_amt)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(contract.status)}>{contract.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {contract.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingId === contract.id}
                          onClick={() => void submitContract(contract)}
                        >
                          {t("loan.submit")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("loan.adjustments_title")}</h2>
          <Select value={kind} onValueChange={(value) => setKind(value as LoanAdjustmentKind)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {loanAdjustmentKinds.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>
                  {t(entry.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loadingAdjustments ? (
          <p className="text-sm text-muted-foreground">{t("loan.loading")}</p>
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loan.field.contract_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.effective_date")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.status")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-[13px]">{adjustment.contract_code}</td>
                    <td className="px-3 py-2">{adjustment.effective_date ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {adjustment.amount != null
                        ? new Intl.NumberFormat("vi-VN").format(adjustment.amount)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(adjustment.status)}>{adjustment.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {adjustment.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingAdjustmentId === adjustment.id}
                          onClick={() => void submitAdjustment(adjustment)}
                        >
                          {t("loan.submit")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
