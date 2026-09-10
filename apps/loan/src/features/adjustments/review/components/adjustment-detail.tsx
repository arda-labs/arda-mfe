import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { formatMoney, fromMinor } from "@workspace/format"
import type { LoanAdjustment, LoanAdjustmentKind } from "../../../api"
import { ADJUSTMENT_KIND_SPECS } from "../../kind-spec"

/** Read-only adjustment record: header fields + per-kind payload values. */
export function AdjustmentDetail({
  kind,
  adjustment,
}: {
  kind: LoanAdjustmentKind
  adjustment: LoanAdjustment
}) {
  const { t } = useI18n()
  const spec = ADJUSTMENT_KIND_SPECS[kind]
  const payload = adjustment.payload ?? {}
  const known = new Set(spec.fields.map((field) => field.key))
  const extra = Object.entries(payload).filter(
    ([key]) => !known.has(key) && key !== "trader"
  )
  const trader = payload.trader as Record<string, unknown> | undefined

  return (
    <div className="space-y-4">
      <div className="grid gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <InfoField
          label={t("loan.adjustment_review.info.contract")}
          value={adjustment.contract_code}
        />
        <InfoField
          label={t("loan.field.agreement_code")}
          value={adjustment.agreement_code || "—"}
        />
        {spec.effectiveDateLabelKey ? (
          <InfoField
            label={t(spec.effectiveDateLabelKey)}
            value={adjustment.effective_date || "—"}
          />
        ) : null}
        {adjustment.amount_minor ? (
          <InfoField
            label={t("loan.field.amount")}
            value={formatMoney(fromMinor(adjustment.amount_minor))}
          />
        ) : null}
        <InfoField
          label={t("loan.adjustment_review.info.status")}
          value={adjustment.status}
        />
        <InfoField
          label={t("loan.adjustment_review.info.created_by")}
          value={adjustment.created_by || "—"}
        />
        {adjustment.decision_note ? (
          <InfoField
            label={t("loan.adjustment_review.info.decision_note")}
            value={adjustment.decision_note}
          />
        ) : null}
      </div>

      <div className="rounded-md border">
        <div className="border-b px-4 py-2 text-sm font-semibold">
          {t("loan.adjustment_review.section.detail")}
        </div>
        <dl className="grid gap-x-8 gap-y-2 p-4 text-sm sm:grid-cols-2">
          {spec.fields.map((field) => {
            const raw = payload[field.key]
            if (raw === undefined || raw === null || raw === "") return null
            let value = String(raw)
            if (field.input === "select" && field.optionKeyPrefix) {
              value = t(`${field.optionKeyPrefix}.${value}`)
            }
            return (
              <InfoField key={field.key} label={t(field.labelKey)} value={value} />
            )
          })}
          {extra.map(([key, raw]) => (
            <InfoField
              key={key}
              label={key}
              value={
                typeof raw === "object" ? JSON.stringify(raw) : String(raw ?? "—")
              }
            />
          ))}
          {spec.fields.length === 0 && extra.length === 0 ? (
            <span className="text-muted-foreground">
              {t("loan.adjustment_review.empty_detail")}
            </span>
          ) : null}
        </dl>
      </div>

      {trader && (trader.object_name || trader.object_code) ? (
        <div className="rounded-md border p-4 text-sm">
          <div className="mb-2 font-semibold">
            {t("loan.adjustment_review.section.trader")}
          </div>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <InfoField
              label={t("loan.adjustment_review.info.trader_name")}
              value={String(trader.object_name ?? "—")}
            />
            <InfoField
              label={t("loan.adjustment_review.info.trader_code")}
              value={String(trader.object_code ?? "—")}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{t(spec.labelKey)}</Badge>
        <span className="font-mono">{spec.kind}</span>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
