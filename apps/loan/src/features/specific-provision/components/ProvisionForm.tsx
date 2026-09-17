import { Calculator, Send } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatMoney, fromMinor } from "@workspace/format"
import type { SpecificProvision } from "../../api"

type ProvisionFormProps = {
  agreementCode: string
  onAgreementCodeChange: (value: string) => void
  provisionDate: string
  onProvisionDateChange: (value: string) => void
  preview: SpecificProvision | null
  busy: boolean
  onCalculate: () => void
  onSubmit: () => void
}

/**
 * Maker form + preview for the specific-provision screen (LNM.306):
 * agreement + period → calculate preview (debt-group rate, outstanding,
 * collateral deduction, base, amount) → submit the case. History rows live in
 * the page table.
 */
export function ProvisionForm({
  agreementCode,
  onAgreementCodeChange,
  provisionDate,
  onProvisionDateChange,
  preview,
  busy,
  onCalculate,
  onSubmit,
}: ProvisionFormProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56 space-y-1.5">
          <Label htmlFor="sp-agreement">
            {t("loan.specific_provision.field.agreement")}
          </Label>
          <Input
            id="sp-agreement"
            placeholder={t("loan.specific_provision.placeholder.agreement")}
            value={agreementCode}
            onChange={(event) => onAgreementCodeChange(event.target.value)}
          />
        </div>
        <div className="w-48 space-y-1.5">
          <Label htmlFor="sp-date">
            {t("loan.specific_provision.field.date")}
          </Label>
          <Input
            id="sp-date"
            type="date"
            value={provisionDate}
            onChange={(event) => onProvisionDateChange(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !provisionDate}
          onClick={onCalculate}
        >
          <Calculator className="size-4" />
          {t("loan.specific_provision.calculate")}
        </Button>
        <Button
          type="button"
          disabled={busy || !provisionDate || !preview}
          onClick={onSubmit}
        >
          <Send className="size-4" />
          {t("loan.specific_provision.submit")}
        </Button>
      </div>

      {preview ? (
        <div className="grid gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <PreviewField
            label={t("loan.specific_provision.field.rate")}
            value={String(preview.rate_percent)}
          />
          <PreviewField
            label={t("loan.specific_provision.field.outstanding")}
            value={formatMoney(fromMinor(preview.outstanding_minor))}
          />
          <PreviewField
            label={t("loan.specific_provision.field.deduction")}
            value={formatMoney(fromMinor(preview.deduction_minor))}
          />
          <PreviewField
            label={t("loan.specific_provision.field.base")}
            value={formatMoney(fromMinor(preview.base_minor))}
          />
          <PreviewField
            label={t("loan.specific_provision.field.amount")}
            value={formatMoney(fromMinor(preview.amount_minor))}
          />
        </div>
      ) : null}
    </div>
  )
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}
