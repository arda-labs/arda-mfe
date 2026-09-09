import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import { disbursementBatchApi, type LoanDisbursementBatch } from "../../api"

const PAGE_SIZE = 8

/**
 * Source-batch picker for "Hoàn tất giải ngân" (iteration 13): server-paged
 * REGISTER batches with status POSTED (GET /api/loan/disbursement-batches?
 * flow_type=REGISTER&status=POSTED). Single-pick — the screen fetches the
 * detail rows of the chosen batch and renders the editable grid.
 */
export function ChooseSourceBatchDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (batch: LoanDisbursementBatch) => void
}) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("loan.disbursements.batch.source_dialog.title")}</DialogTitle>
          </DialogHeader>
          <PickerContent onPick={onPick} onClose={() => onOpenChange(false)} />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function PickerContent({
  onPick,
  onClose,
}: {
  onPick: (batch: LoanDisbursementBatch) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const batchesQuery = useQuery({
    queryKey: ["loan", "source-batch-picker", search, page],
    queryFn: () =>
      disbursementBatchApi.list({
        flow_type: "REGISTER",
        status: "POSTED",
        q: search || undefined,
        page,
        per_page: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  })

  const items = batchesQuery.data?.items ?? []
  const total = batchesQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="source-batch-search">{t("loan.disbursements.batch.source_dialog.search")}</Label>
          <Input
            id="source-batch-search"
            placeholder={t("loan.disbursements.batch.source_dialog.search_placeholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.disbursements.batch.source_dialog.col_case")}</TableHead>
                <TableHead>{t("loan.disbursements.batch.source_dialog.col_date")}</TableHead>
                <TableHead>{t("loan.disbursements.batch.source_dialog.col_method")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.disbursements.batch.source_dialog.col_total")}
                </TableHead>
                <TableHead>{t("common.field.description")}</TableHead>
                <TableHead className="w-16 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    {batchesQuery.isLoading ? "…" : t("loan.contract_picker.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-xs text-primary">
                      {batch.case_code || batch.workflow_case_code || batch.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateShort(batch.txn_date)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {batch.payment_method === "CASH"
                        ? t("loan.disbursements.batch.payment.cash")
                        : t("loan.disbursements.batch.payment.transfer")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">
                      {formatAmount(fromMinor(batch.total_amt_minor ?? 0), "VND")}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {batch.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          onPick(batch)
                          onClose()
                        }}
                      >
                        {t("loan.contract_picker.choose")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter className="items-center justify-between sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {t("common.pagination.page_of")
            .replace("{page}", String(page))
            .replace("{totalPages}", String(totalPages))}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("common.action.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("common.action.next")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("common.action.close")}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
