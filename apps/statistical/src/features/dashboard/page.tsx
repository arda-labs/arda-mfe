import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { statisticalApi, type DashboardSummary } from "../api"

/** QCMS dashboard (W5c): catalog + submission activity at a glance. */
export function DashboardPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    void statisticalApi
      .getDashboard()
      .then((value) => {
        setSummary(value)
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
  }, [])

  if (loadError) {
    return <div className="p-6 text-sm text-muted-foreground">{t("statistical.dashboard.load_failed")}</div>
  }
  if (!summary) {
    return <div className="p-6 text-sm text-muted-foreground">{t("statistical.dashboard.loading")}</div>
  }

  const statuses = Object.entries(summary.submissions_by_status)
  const kinds = Object.entries(summary.catalog_by_kind)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("statistical.dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("statistical.dashboard.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card label={t("statistical.dashboard.report_definitions")} value={summary.report_definitions} />
        <Card label={t("statistical.dashboard.indicators")} value={summary.indicators} />
        <Card label={t("statistical.dashboard.form_templates")} value={summary.form_templates} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t("statistical.dashboard.submissions")}</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t("common.field.status")}</TableHead>
                  <TableHead className="text-right">{t("statistical.dashboard.count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-4 text-center text-muted-foreground">
                      {t("statistical.dashboard.empty")}
                    </TableCell>
                  </TableRow>
                )}
                {statuses.map(([status, count]) => (
                  <TableRow key={status}>
                    <TableCell>{status}</TableCell>
                    <TableCell className="text-right tabular-nums">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t("statistical.dashboard.catalog")}</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t("statistical.dashboard.kind")}</TableHead>
                  <TableHead className="text-right">{t("statistical.dashboard.count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kinds.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-4 text-center text-muted-foreground">
                      {t("statistical.dashboard.empty")}
                    </TableCell>
                  </TableRow>
                )}
                {kinds.map(([kind, count]) => (
                  <TableRow key={kind}>
                    <TableCell>{t(`statistical.catalogs.kind.${kind}`)}</TableCell>
                    <TableCell className="text-right tabular-nums">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
