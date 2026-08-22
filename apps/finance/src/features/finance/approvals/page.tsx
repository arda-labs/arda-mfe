import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { financeApi, type ApprovalRequest } from "@/features/finance/api"
import { notify } from "@workspace/notifications/notify"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Input } from "@workspace/ui/components/input"
import { FormField } from "@workspace/ui/components/form-field"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/ui/admin-list/client-list"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/ui/admin-list/column-filters"

const approvalFormSchema = z.object({
  refId: z.string().trim().min(1, "Reference ID is required"),
  requestType: z.enum(["TRANSFER", "DEPOSIT", "WITHDRAWAL"]),
  amount: z.string().trim().optional().refine((value) => !value || Number(value) > 0, "Amount must be positive"),
  note: z.string().trim().max(500, "Note is too long").optional(),
})

type ApprovalFormValues = z.infer<typeof approvalFormSchema>

const approvalDefaultValues: ApprovalFormValues = {
  refId: "",
  requestType: "TRANSFER",
  amount: "",
  note: "",
}

const STATUS_VARIANTS: Partial<Record<string, "default" | "success" | "error" | "warning" | "info">> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
}

const DEFAULT_PAGE_SIZE = 20

type DecisionAction = "approve" | "reject"

export function ApprovalsPage() {
  const { t } = useI18n()
  const [level, setLevel] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ApprovalRequest | null>(null)
  const [decision, setDecision] = useState<DecisionAction>("approve")
  const [note, setNote] = useState("")
  const [cancelTarget, setCancelTarget] = useState<ApprovalRequest | null>(null)

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [savingCreate, setSavingCreate] = useState(false)
  const [decisionPending, setDecisionPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: approvalDefaultValues,
  })

  const loadApprovals = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await financeApi.listPendingApprovals(level)
      setApprovals(result.approvals ?? [])
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [level])

  useEffect(() => {
    void loadApprovals(true)
  }, [loadApprovals])

  function openReview(target: ApprovalRequest, action: DecisionAction) {
    setReviewTarget(target)
    setDecision(action)
    setNote("")
  }

  function closeReview() {
    setReviewTarget(null)
    setNote("")
  }

  async function submitReview() {
    if (!reviewTarget) return
    setDecisionPending(true)
    try {
      if (decision === "approve") {
        await financeApi.approveApproval(reviewTarget.id, note)
        notify.success("Approval accepted")
      } else {
        await financeApi.rejectApproval(reviewTarget.id, note)
        notify.success("Approval rejected")
      }
      closeReview()
      await loadApprovals()
    } catch (reason) {
      notify.error(reason instanceof Error ? reason.message : "Could not update approval")
    } finally {
      setDecisionPending(false)
    }
  }

  const columns = useMemo<ColumnDef<ApprovalRequest>[]>(() => [
    {
      id: "requestType",
      accessorKey: "requestType",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("common.field.type")} />,
      enableColumnFilter: true,
      meta: multiSelectFilterMeta(t("common.field.type"), [
        { label: "Transfer", value: "TRANSFER" },
        { label: "Deposit", value: "DEPOSIT" },
        { label: "Withdrawal", value: "WITHDRAWAL" },
      ]),
      cell: ({ row }) => <span className="font-medium">{row.original.requestType}</span>,
    },
    {
      id: "refId",
      accessorKey: "refId",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Reference" />,
      enableColumnFilter: true,
      meta: textSearchMeta("Reference", "Reference"),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.refId}</span>,
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
      cell: ({ row }) => <span className="text-right tabular-nums text-muted-foreground">{row.original.amount ? `${Number(row.original.amount).toLocaleString()} ${row.original.currency}` : "—"}</span>,
    },
    {
      id: "level",
      header: () => <span className="text-xs font-semibold text-foreground/80">Level</span>,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.currentLevel}/{row.original.totalLevels}</span>,
      enableSorting: false,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("common.field.status")} />,
      cell: ({ row }) => <Status variant={STATUS_VARIANTS[row.original.status] || "default"}><StatusIndicator /><StatusLabel>{row.original.status}</StatusLabel></Status>,
    },
    {
      id: "actions",
      header: () => <div className="text-right text-xs font-semibold text-foreground/80">{t("common.field.action")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => openReview(row.original, "approve")}>Review</Button>
          <Button variant="destructive" size="sm" disabled={cancelling} onClick={() => setCancelTarget(row.original)}>{t("common.action.cancel")}</Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [cancelling, t])

  const { table, total } = useClientListTable({
    columns,
    items: approvals,
    filterBy: {
      refId: (item, value) => matchTextColumnFilter(value, item.refId),
      requestType: (item, value) => matchSelectFilter(item.requestType, value),
    },
    sort: (rows, sorting) => sortByColumn(rows, sorting, {
      requestType: (a, b) => a.requestType.localeCompare(b.requestType),
      refId: (a, b) => a.refId.localeCompare(b.refId),
      amount: (a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0),
      status: (a, b) => a.status.localeCompare(b.status),
    }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const handleCreateOpenChange = (nextOpen: boolean) => {
    setCreateOpen(nextOpen)
    if (!nextOpen) reset(approvalDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    setSavingCreate(true)
    try {
      await financeApi.createApproval({
        refId: values.refId,
        requestType: values.requestType,
        amount: values.amount || undefined,
        note: values.note || undefined,
      })
      notify.success("Approval request created")
      setCreateOpen(false)
      reset(approvalDefaultValues)
      await loadApprovals()
    } catch (reason) {
      notify.error(reason instanceof Error ? reason.message : "Could not create approval request")
    } finally {
      setSavingCreate(false)
    }
  })

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await financeApi.cancelApproval(cancelTarget.id)
      notify.success("Approval cancelled")
      setCancelTarget(null)
      await loadApprovals()
    } catch (reason) {
      notify.error(reason instanceof Error ? reason.message : "Could not cancel approval")
    } finally {
      setCancelling(false)
    }
  }

  const levelSelector = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Level:</span>
      {[1, 2, 3, 4].map((l) => (
        <Button key={l} variant={level === l ? "default" : "outline"} size="sm" onClick={() => setLevel(l)}>{l}</Button>
      ))}
    </div>
  )

  const dialogs = (
    <>
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("finance.approvals.title")}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField label="Reference ID" error={errors.refId?.message}><Input aria-invalid={Boolean(errors.refId)} {...register("refId")} /></FormField>
            <FormField label={t("common.field.type")} error={errors.requestType?.message}>
              <Controller control={control} name="requestType" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={Boolean(errors.requestType)}><SelectValue placeholder={t("common.field.type")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Amount" error={errors.amount?.message}><Input aria-invalid={Boolean(errors.amount)} {...register("amount")} /></FormField>
            <FormField label="Note" error={errors.note?.message}><Input aria-invalid={Boolean(errors.note)} {...register("note")} /></FormField>
            <Button className="w-full" type="submit" disabled={isSubmitting || savingCreate}>{t("common.action.create")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewTarget !== null} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === "approve" ? "Approve" : "Reject"} request</DialogTitle>
            <DialogDescription>{reviewTarget?.requestType} · Ref {reviewTarget?.refId} · Level {reviewTarget?.currentLevel}/{reviewTarget?.totalLevels}</DialogDescription>
          </DialogHeader>
          {reviewTarget?.makerNote ? <p className="text-sm italic text-muted-foreground">{reviewTarget.makerNote}</p> : null}
          {reviewTarget?.steps && reviewTarget.steps.length > 0 ? (
            <div className="rounded-md border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Approval History:</p>
              {reviewTarget.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Level {step.level}:</span>
                  <Status variant={step.decision === "APPROVED" ? "success" : "error"}><StatusIndicator /><StatusLabel>{step.decision}</StatusLabel></Status>
                  <span>by {step.checkerId.slice(0, 8)}</span>
                  {step.note && <span>— {step.note}</span>}
                </div>
              ))}
            </div>
          ) : null}
          <FormField label="Note (optional)"><Input value={note} onChange={(event) => setNote(event.target.value)} /></FormField>
          <DialogFooter>
            <Button variant="outline" onClick={closeReview}>{t("common.action.back")}</Button>
            {decision === "approve" ? (
              <Button disabled={decisionPending} onClick={() => void submitReview()}>Approve</Button>
            ) : (
              <Button variant="destructive" disabled={decisionPending} onClick={() => void submitReview()}>Reject</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm approval cancellation</AlertDialogTitle>
            <AlertDialogDescription>This will cancel approval request {cancelTarget?.refId || cancelTarget?.id || ""}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.back")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={cancelling} onClick={() => void handleCancel()}>
              {t("common.action.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("finance.approvals.title")}
      totalRows={total}
      meta={<Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">{total}</Badge>}
      actions={levelSelector}
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadApprovals}
      fetching={refreshing}
      table={table}
      toolbar={<ListTableToolbar table={table} onCreate={() => setCreateOpen(true)} createLabel={t("common.action.create")} />}
      dialogs={dialogs}
    />
  )
}
