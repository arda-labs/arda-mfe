import { useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { loanApi, type LoanContract } from "../../api"

/**
 * Hợp đồng tín dụng select cho màn điều chỉnh — ACTIVE + CLOSED (adjustment
 * cần tra lịch trả nợ của hợp đồng đã ACTIVE; CLOSED giữ lại để tra cũ),
 * hiển thị số HĐ + khách hàng + trạng thái. Value = contract_code (BE
 * adjustment keyed theo contract_code); `onChange` trả kèm row (uuid id cho
 * dossier lookup). Controlled hoàn toàn — không state shadow.
 */
export function ContractSelect({
  value,
  onChange,
  id = "adjustment-contract",
}: {
  value: string
  /** `contract` also carries the uuid id — dossier lookups key on id. */
  onChange: (contract: LoanContract | null) => void
  id?: string
}) {
  const { t } = useI18n()
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [loaded, setLoaded] = useState(false)
  const loading = !loaded

  useEffect(() => {
    let cancelled = false
    const loadActive = loanApi
      .listContracts({ status: "ACTIVE" })
      .then(async (res) => {
        if (cancelled) return
        const active = res.items
        // CLOSED đi kèm không fail-open: lỗi chỉ làm mất phần tra cũ (gate
        // check-no-fail-open yêu cầu không nuốt lỗi thành dữ liệu rỗng).
        try {
          const closed = await loanApi.listContracts({ status: "CLOSED" })
          if (cancelled) return
          const seen = new Set(active.map((c) => c.id))
          setContracts([...active, ...closed.items.filter((c) => !seen.has(c.id))])
        } catch {
          if (!cancelled) setContracts(active)
        }
        if (!cancelled) setLoaded(true)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setContracts([])
          setLoaded(true)
          notify.error(translateApiError(error, t("loan.load_failed")))
        }
      })
    return () => {
      cancelled = true
      void loadActive
    }
  }, [t])

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("loan.field.contract_code")}</Label>
      <Select
        value={value || undefined}
        onValueChange={(next) => {
          onChange(contracts.find((c) => c.contract_code === next) ?? null)
        }}
        disabled={loading}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue
            placeholder={
              loading ? t("loan.loading") : t("loan.adjustment_screen.placeholder.contract")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {contracts.map((contract) => (
            <SelectItem key={contract.id} value={contract.contract_code}>
              {contractLabel(contract)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
