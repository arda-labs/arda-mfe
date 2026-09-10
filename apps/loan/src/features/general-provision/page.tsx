import { useCallback, useEffect, useState } from "react"
import { Calculator, RefreshCw, Send } from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatMoney, fromMinor, todayISO } from "@workspace/format"
import { generalProvisionApi, type GeneralProvision } from "../api"

/**
 * Trích lập dự phòng chung (LNM.307.01): maker chọn org + kỳ → xem trước
 * (rate, tổng dư nợ, lũy kế, phải trích, trích/hoàn) → trình duyệt case.
 * Checker duyệt ở workbench; approve sẽ post qua rule card LNM_PROVISION.
 */
export function GeneralProvisionPage() {
  const { t } = useI18n()
  const [orgCode, setOrgCode] = useState("")
  const [provisionDate, setProvisionDate] = useState(todayISO())
  const [preview, setPreview] = useState<GeneralProvision | null>(null)
  const [items, setItems] = useState<GeneralProvision[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await generalProvisionApi.list()
      setItems(res.items)
    } catch (error) {
      notify.error(
        translateApiError(error, t("loan.general_provision.load_failed"))
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function calculate() {
    setCalculating(true)
    try {
      const result = await generalProvisionApi.calculate({
        org_code: orgCode.trim(),
        provision_date: provisionDate,
      })
      setPreview(result)
    } catch (error) {
      notify.error(
        translateApiError(error, t("loan.general_provision.calculate_failed"))
      )
    } finally {
      setCalculating(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      await generalProvisionApi.submit({
        org_code: orgCode.trim(),
        provision_date: provisionDate,
      })
      notify.success(t("loan.general_provision.submit_success"))
      setPreview(null)
      await load()
    } catch (error) {
      notify.error(
        translateApiError(error, t("loan.general_provision.submit_failed"))
      )
    } finally {
      setSubmitting(false)
    }
  }

  const busy = calculating || submitting

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("loan.general_provision.title")}
        description={t("loan.general_provision.description")}
        meta={
          items.length ? (
            <Badge variant="secondary" className="shrink-0">
              {t("loan.general_provision.count_badge", { count: items.length })}
            </Badge>
          ) : null
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
            {t("loan.general_provision.refresh")}
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56 space-y-1.5">
            <Label htmlFor="gp-org">
              {t("loan.general_provision.field.org")}
            </Label>
            <Input
              id="gp-org"
              placeholder={t("loan.general_provision.placeholder.org")}
              value={orgCode}
              onChange={(event) => setOrgCode(event.target.value)}
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
              onChange={(event) => setProvisionDate(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !provisionDate}
            onClick={() => void calculate()}
          >
            <Calculator className="size-4" />
            {t("loan.general_provision.calculate")}
          </Button>
          <Button
            type="button"
            disabled={busy || !provisionDate || !preview}
            onClick={() => void submit()}
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

        {loading ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.general_provision.loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("loan.general_provision.empty")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("loan.general_provision.col.date")}</TableHead>
                  <TableHead>{t("loan.general_provision.col.org")}</TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.rate")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.outstanding")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.accum")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.required")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.alloc")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.general_provision.col.reverse")}
                  </TableHead>
                  <TableHead>{t("loan.general_provision.col.status")}</TableHead>
                  <TableHead>{t("loan.general_provision.col.case")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {row.provision_date}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.org_code}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.rate_percent}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(row.total_outstanding_minor))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(row.accum_provision_minor))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(row.required_provision_minor))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(row.alloc_minor))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(fromMinor(row.reverse_minor))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>
                        {row.status
                          ? t(`loan.general_provision.status.${row.status}`)
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.workflow_case_code || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Page>
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

function statusVariant(status?: string) {
  switch (status) {
    case "POSTED":
      return "default" as const
    case "SUBMITTED":
      return "secondary" as const
    case "REJECTED":
      return "destructive" as const
    default:
      return "outline" as const
  }
}
