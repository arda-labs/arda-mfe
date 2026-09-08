import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { AccountOption, ChooseAccountDialogLabels, FetchAccountsFn } from "./types"

const PAGE_SIZE = 8

/**
 * Account picker for the entry-lines grid: search + paginated table over a
 * consumer-supplied `fetchAccounts` (the finance remote wires its accounts
 * list API; other remotes can wire their own). Selecting a row returns the
 * account. Search/page state lives in a child of the Dialog so it resets
 * naturally when closed (unmount) — no setState-in-effect reset.
 */
export function ChooseAccountDialog({
  open,
  onOpenChange,
  fetchAccounts,
  onSelect,
  labels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fetchAccounts: FetchAccountsFn
  onSelect: (account: AccountOption) => void
  labels: ChooseAccountDialogLabels
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
          </DialogHeader>
          <AccountPickerContent
            fetchAccounts={fetchAccounts}
            onSelect={onSelect}
            onClose={() => onOpenChange(false)}
            labels={labels}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function AccountPickerContent({
  fetchAccounts,
  onSelect,
  onClose,
  labels,
}: {
  fetchAccounts: FetchAccountsFn
  onSelect: (account: AccountOption) => void
  onClose: () => void
  labels: ChooseAccountDialogLabels
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["posting-flow", "accounts", search, page],
    queryFn: () => fetchAccounts({ q: search || undefined, page, perPage: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={labels.searchPlaceholder}
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
              <TableHead className="w-32">{labels.colCode}</TableHead>
              <TableHead>{labels.colName}</TableHead>
              <TableHead className="w-20 text-right">{labels.colCurrency}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {isLoading ? "…" : labels.empty}
                </TableCell>
              </TableRow>
            ) : (
              items.map((account) => (
                <TableRow
                  key={account.code}
                  className="cursor-pointer"
                  onClick={() => onSelect(account)}
                >
                  <TableCell className="font-mono text-xs">{account.code}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {account.currency ?? "—"}
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
