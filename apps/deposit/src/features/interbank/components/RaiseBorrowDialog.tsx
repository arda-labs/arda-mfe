import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { toMinor, todayISO } from "@workspace/format"
import {
  depositApi,
  type IbmFundingPurpose,
  type IbmLenderType,
} from "../../api"

const LENDER_TYPES: IbmLenderType[] = ["NHHTX", "NHNN", "OTHER_TCTD", "SAFETY_FUND"]
const FUNDING_PURPOSES: IbmFundingPurpose[] = [
  "CREDIT_EXPANSION",
  "DEPOSIT_PAYMENT",
  "DIFFICULTY",
  "SPECIAL",
  "OTHER",
]

/**
 * Stage one interbank BORROWING (tiền vay TCTD khác). The contract lands as
 * PENDING_APPROVAL and only becomes ACTIVE when a checker approves it, so this
 * dialog creates a request, not an active contract.
 *
 * lender_type and funding_purpose are required: the PCF "Tiền vay TCTD"
 * indicators split on them, and a blank would land the amount in an
 * unreportable bucket.
 */
export function RaiseBorrowDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [borrowCode, setBorrowCode] = useState("")
  const [counterpartyCode, setCounterpartyCode] = useState("")
  const [counterpartyName, setCounterpartyName] = useState("")
  const [lenderType, setLenderType] = useState<IbmLenderType>("OTHER_TCTD")
  const [fundingPurpose, setFundingPurpose] = useState<IbmFundingPurpose>("OTHER")
  const [termMonths, setTermMonths] = useState("12")
  const [drawdownDate, setDrawdownDate] = useState(todayISO())
  const [maturityDate, setMaturityDate] = useState("")
  const [principal, setPrincipal] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [currencyCode, setCurrencyCode] = useState("VND")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setBorrowCode("")
    setCounterpartyCode("")
    setCounterpartyName("")
    setLenderType("OTHER_TCTD")
    setFundingPurpose("OTHER")
    setTermMonths("12")
    setDrawdownDate(todayISO())
    setMaturityDate("")
    setPrincipal("")
    setInterestRate("")
    setCurrencyCode("VND")
  }, [open])

  const submit = async () => {
    const principalMinor = toMinor(Number(principal) || 0, currencyCode)
    if (!borrowCode.trim() || !counterpartyCode.trim() || principalMinor <= 0 || !maturityDate) {
      notify.error(t("deposit.borrow.validation.required"))
      return
    }
    setPending(true)
    try {
      await depositApi.createBorrow({
        borrow_code: borrowCode.trim(),
        counterparty_code: counterpartyCode.trim(),
        counterparty_name: counterpartyName.trim() || undefined,
        lender_type: lenderType,
        funding_purpose: fundingPurpose,
        term_months: Number(termMonths) || 0,
        drawdown_date: drawdownDate,
        maturity_date: maturityDate,
        principal_minor: principalMinor,
        interest_rate: Number(interestRate) || 0,
        currency_code: currencyCode.toUpperCase(),
      })
      notify.success(t("deposit.borrow.create_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("deposit.borrow.create_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.borrow.create_title")}</DialogTitle>
          <DialogDescription>{t("deposit.borrow.create_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.borrow_code")}</Label>
            <Input value={borrowCode} onChange={(e) => setBorrowCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.counterparty")}</Label>
            <Input
              value={counterpartyCode}
              onChange={(e) => setCounterpartyCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.counterparty_name")}</Label>
            <Input
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.lender_type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={lenderType}
              onChange={(e) => setLenderType(e.target.value as IbmLenderType)}
            >
              {LENDER_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`deposit.borrow.lender.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.funding_purpose")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fundingPurpose}
              onChange={(e) => setFundingPurpose(e.target.value as IbmFundingPurpose)}
            >
              {FUNDING_PURPOSES.map((value) => (
                <option key={value} value={value}>
                  {t(`deposit.borrow.purpose.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.term_months")}</Label>
            <Input
              type="number"
              min={0}
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.drawdown_date")}</Label>
            <Input
              type="date"
              value={drawdownDate}
              onChange={(e) => setDrawdownDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.maturity_date")}</Label>
            <Input
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.principal")}</Label>
            <Input
              type="number"
              min={0}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.interest_rate")}</Label>
            <Input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.borrow.field.currency")}</Label>
            <Input
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
