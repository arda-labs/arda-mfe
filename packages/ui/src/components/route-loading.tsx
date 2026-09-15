import { useI18n } from "@workspace/i18n"
import { Skeleton } from "./skeleton"

export function RouteLoading() {
  const { t } = useI18n()
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <span className="sr-only" role="status">{t("common.loading")}</span>
      <Skeleton className="h-7 w-48 motion-reduce:animate-none" />
      <Skeleton className="h-10 w-full motion-reduce:animate-none" />
      <div className="space-y-3 rounded-lg border p-4">
        {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-10 w-full motion-reduce:animate-none" />)}
      </div>
    </div>
  )
}
