import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { AlertTriangle } from "lucide-react"

type ErrorPageProps = {
  code: "404" | "502"
}

export function ErrorPage({ code }: ErrorPageProps) {
  const { t } = useI18n()

  const title =
    code === "404"
      ? t("common.error.not_found.title")
      : t("common.error.bad_gateway_page.title")
  const body =
    code === "404"
      ? t("common.error.not_found.body")
      : t("common.error.bad_gateway_page.body")

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-pretty text-muted-foreground">{body}</p>
      </div>
      <Button type="button" variant="outline" onClick={() => window.history.back()}>
        {t("common.action.back")}
      </Button>
    </div>
  )
}

export function NotFoundPage() {
  return <ErrorPage code="404" />
}

export function BadGatewayPage() {
  return <ErrorPage code="502" />
}
