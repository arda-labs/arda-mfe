import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { loanAdjustmentKinds } from "../api"
import { ADJUSTMENT_KIND_SPECS } from "./kind-spec"

/**
 * Index /loans/adjustments — khối điều hướng 11 kinds dạng card (tên + mô tả
 * + nút "Mở màn") thay cho dialog generic cũ. Route /loans/adjustments/{kind}
 * mở màn riêng từng kind.
 */
export function AdjustmentsIndexPage() {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <Page>
      <PageHeader
        title={t("loan.adjustment_screen.index_title")}
        description={t("loan.adjustment_screen.index_description")}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loanAdjustmentKinds.map((entry) => {
          const spec = ADJUSTMENT_KIND_SPECS[entry.key]
          return (
            <Card key={entry.key} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t(entry.labelKey)}</CardTitle>
                <CardDescription className="text-xs">
                  {t(spec.descriptionKey)}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/loans/adjustments/${entry.key}`)}
                >
                  {t("loan.adjustment_screen.open")}
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
