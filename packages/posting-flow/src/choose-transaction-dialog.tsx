import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import type { ChooseTransactionDialogLabels, FetchTransactionsFn, TransactionOption } from "./types"

const PAGE_SIZE = 8

/**
 * Transaction picker for the cancellation flow (FAC.300.01 "Giao dịch cần
 * hủy"): search card (Loại giao dịch / Mã giao dịch / Từ ngày / Đến ngày) +
 * paginated table of journal entries over a consumer-supplied
 * `fetchTransactions` (the finance remote wires `GET /api/finance/
 * journal-entries` with `document_type/from_date/to_date/q/page/page_size`).
 * Mirrors `ChooseAccountDialog`: search/page state lives in a child of the
 * Dialog so it resets naturally when closed (unmount) — no setState-in-effect.
 */
export function ChooseTransactionDialog({
  open,
  onOpenChange,
  fetchTransactions,
  documentTypes,
  onSelect,
  labels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fetchTransactions: FetchTransactionsFn
  /** Pre-translated Loại giao dịch options (Bút toán lẻ / Bút toán kép / Ngoại bảng). */
  documentTypes: { value: string; label: string }[]
  onSelect: (entry: TransactionOption) => void
  labels: ChooseTransactionDialogLabels
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
          </DialogHeader>
          <TransactionPickerContent
            fetchTransactions={fetchTransactions}
            documentTypes={documentTypes}
            onSelect={onSelect}
            onClose={() => onOpenChange(false)}
            labels={labels}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function TransactionPickerContent({
  fetchTransactions,
  documentTypes,
  onSelect,
  onClose,
  labels,
}: {
  fetchTransactions: FetchTransactionsFn
  documentTypes: { value: string; label: string }[]
  onSelect: (entry: TransactionOption) => void
  onClose: () => void
  labels: ChooseTransactionDialogLabels
}) {
  const [documentType, setDocumentType] = useState<string>("ALL")
  const [entryNo, setEntryNo] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["posting-flow", "transactions", documentType, entryNo, fromDate, toDate, page],
    queryFn: () =>
      fetchTransactions({
        document_type: documentType === "ALL" ? undefined : documentType,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        q: entryNo || undefined,
        page,
        perPage: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const typeLabel = (value: string) =>
    documentTypes.find((option) => option.value === value)?.label ?? value

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="choose-txn-type">{labels.docType}</Label>
          <Select
            value={documentType}
            onValueChange={(value) => {
              setDocumentType(value)
              setPage(1)
            }}
          >
            <SelectTrigger id="choose-txn-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{labels.docTypeAll}</SelectItem>
              {documentTypes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="choose-txn-code">{labels.searchCode}</Label>
          <Input
            id="choose-txn-code"
            placeholder={labels.searchCodePlaceholder}
            value={entryNo}
            onChange={(e) => {
              setEntryNo(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="choose-txn-from">{labels.fromDate}</Label>
          <Input
            id="choose-txn-from"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="choose-txn-to">{labels.toDate}</Label>
          <Input
            id="choose-txn-to"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">{labels.colEntryNo}</TableHead>
              <TableHead className="w-28">{labels.colDate}</TableHead>
              <TableHead className="w-36">{labels.colType}</TableHead>
              <TableHead className="w-32 text-right">{labels.colAmount}</TableHead>
              <TableHead>{labels.colDescription}</TableHead>
              <TableHead className="w-16 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {isLoading ? "…" : labels.empty}
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow key={entry.entry_no}>
                  <TableCell className="font-mono text-xs">
                    {formatEntryNo(entry.entry_no)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateShort(entry.accounting_date)}
                  </TableCell>
                  <TableCell className="text-xs">{typeLabel(entry.document_type)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">
                    {entry.total_amount_minor !== undefined
                      ? formatAmount(fromMinor(entry.total_amount_minor, entry.currency_code ?? "VND"), entry.currency_code ?? "VND")
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm">{entry.description}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onSelect(entry)}
                    >
                      {labels.choose}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="items-center justify-between sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {labels.pageOf
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
            {labels.prev}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {labels.next}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {labels.close}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

/** JE-000123 — mirrors the journal list display in the finance remote. */
export function formatEntryNo(entryNo: number): string {
  return `JE-${String(entryNo).padStart(6, "0")}`
}
