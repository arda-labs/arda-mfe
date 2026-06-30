import { useEffect, useState } from "react"
import { financeApi } from "@/features/finance/api"
import type { Transaction } from "@/features/finance/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Spinner } from "@workspace/ui/components/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

const STATUS_VARIANTS: Partial<Record<string, "default" | "success" | "error" | "warning" | "info">> = {
  POSTED: "success",
  PENDING: "warning",
  REVERSED: "default",
  FAILED: "error",
}

const DEFAULT_PAGE_SIZE = 10

export function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ txnType: "TRANSFER", description: "", entries: [{ accountId: "", type: "DEBIT", amount: "" }, { accountId: "", type: "CREDIT", amount: "" }] })
  const size = DEFAULT_PAGE_SIZE

  const load = async () => {
    setLoading(true)
    try {
      const res = await financeApi.listTransactions({ page, size })
      setTxns(res.transactions || [])
      setTotal(res.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])

  const handleCreate = async () => {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await financeApi.createTransaction({ ...form, idempotencyKey })
    setOpen(false)
    setForm({ txnType: "TRANSFER", description: "", entries: [{ accountId: "", type: "DEBIT", amount: "" }, { accountId: "", type: "CREDIT", amount: "" }] })
    load()
  }

  const updateEntry = (idx: number, field: string, value: string) => {
    const entries = [...form.entries]
    entries[idx] = { ...entries[idx], [field]: value }
    setForm(p => ({ ...p, entries }))
  }

  const totalPages = Math.ceil(total / size)

  if (loading) return <div className="flex justify-center p-8"><Spinner className="size-6" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            {total} total
          </Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="h-9 px-4 text-sm">Create Transaction</DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FormField label="Transaction type">
                <Select
                  value={form.txnType}
                  onValueChange={(val) => setForm(p => ({ ...p, txnType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="FEE">Fee</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Description">
                <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </FormField>

              <p className="text-sm font-medium">Entries (debit = credit)</p>
              {form.entries.map((e, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
                  <FormField label="Account ID">
                    <Input value={e.accountId} onChange={v => updateEntry(i, "accountId", v.target.value)} />
                  </FormField>
                  <FormField label="Type">
                    <Select
                      value={e.type}
                      onValueChange={(val) => updateEntry(i, "type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Amount">
                    <Input value={e.amount} onChange={v => updateEntry(i, "amount", v.target.value)} />
                  </FormField>
                </div>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setForm(p => ({...p, entries: [...p.entries, { accountId: "", type: "DEBIT", amount: "" }] }))}>
                  + Entry
                </Button>
              </div>

              <Button className="w-full" onClick={handleCreate}>Post Transaction</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">ID</th>
              <th className="p-3 text-left font-medium">Type</th>
              <th className="p-3 text-left font-medium">Date</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Description</th>
              <th className="p-3 text-left font-medium">Created By</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{t.id.slice(0, 8)}…</td>
                <td className="p-3 font-medium">{t.txnType}</td>
                <td className="p-3 text-muted-foreground">{new Date(t.postedAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <Status variant={STATUS_VARIANTS[t.status] || "default"}>
                    <StatusIndicator />
                    <StatusLabel>{t.status}</StatusLabel>
                  </Status>
                </td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{t.description || "—"}</td>
                <td className="p-3 text-muted-foreground">{t.createdBy.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
