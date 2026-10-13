import { useI18n } from "@workspace/i18n"
import { DocCode } from "@workspace/ui/components/doc-code"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"

/** Code chip of a voucher being prepared: issued only when it is submitted. */
export function PendingDocCode() {
  return <DocCode pending />
}

/**
 * Maker → checker → posted for a voucher that is still being prepared
 * (design board 05): answers "who is it waiting on" before it is submitted.
 */
export function DraftLifecycle({ maker }: { maker?: string }) {
  const { t } = useI18n()
  return (
    <LifecycleSteps
      label={t("finance.posting.lifecycle.label")}
      steps={[
        {
          id: "maker",
          label: t("finance.posting.lifecycle.maker"),
          state: "current",
          meta: maker,
        },
        { id: "checker", label: t("finance.posting.lifecycle.checker"), state: "todo" },
        { id: "posted", label: t("finance.posting.lifecycle.posted"), state: "todo" },
      ]}
    />
  )
}
