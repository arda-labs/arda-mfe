import { Calculator, Send } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatMoney, fromMinor } from "@workspace/format"
import type { GeneralProvision } from "../../api"

type ProvisionFormProps = {
  orgCode: string
  onOrgCodeChange: (value: string) => void
  provisionDate: string
  onProvisionDateChange: (value: string) => void
  preview: GeneralProvision | null
  busy: boolean
  onCalculate: () => void
  onSubmit: () => void
}

/**
 * Maker form + preview for the general-provision screen (LNM.307.01):
 * org + period → calculate preview (rate, outstanding, accum, required,
 * alloc/reverse) → submit the case. History rows live in the page table.
 */
export function ProvisionForm({
  orgCode,
  onOrgCodeChange,
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
          <Label htmlFor="gp-org">{t("loan.general_provision.field.org")}</Label>
          <Input
            id="gp-org"
            placeholder={t("loan.general_provision.placeholder.org")}
            value={orgCode}
            onChange={(event) => onOrgCodeChange(event.target.value)}
          />
        </div>
        <div className="w-48 space-y-1.5">
          <Label htmlFor="gp-date">
            {t("loan.general_provision.field.date")}
          </Label>
          <Input
            id="gp-date"
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
          {t("loan.general_provision.calculate")}
        </Button>
        <Button
          type="button"
          disabled={busy || !provisionDate || !preview}
          onClick={onSubmit}
        >
          <Send className="size-4" />
          {t("loan.general_provision.submit")}
        </Button>
      </div>

      {preview ? (
        <div className="grid gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <PreviewField
            label={t("loan.general_provision.field.rate")}
            value={String(preview.rate_percent)}
          />
          <PreviewField
            label={t("loan.general_provision.field.outstanding")}
            value={formatMoney(fromMinor(preview.total_outstanding_minor))}
          />
          <PreviewField
            label={t("loan.general_provision.field.accum")}
            value={formatMoney(fromMinor(preview.accum_provision_minor))}
          />
          <PreviewField
            label={t("loan.general_provision.field.required")}
            value={formatMoney(fromMinor(preview.required_provision_minor))}
          />
          <PreviewField
            label={t("loan.general_provision.field.alloc")}
            value={formatMoney(fromMinor(preview.alloc_minor))}
          />
          <PreviewField
            label={t("loan.general_provision.field.reverse")}
            value={formatMoney(fromMinor(preview.reverse_minor))}
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
