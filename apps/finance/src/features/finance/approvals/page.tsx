import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ShieldCheck } from "lucide-react"
import { notify } from "@workspace/notifications/notify"
import type { ApprovalRequest } from "@/features/finance/api"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useI18n } from "@workspace/i18n"
import {
  useApproveApproval,
  useCancelApproval,
  useCreateApproval,
  usePendingApprovals,
  useRejectApproval,
} from "./queries"

const approvalFormSchema = z.object({
  refId: z.string().trim().min(1, "Reference ID is required"),
  requestType: z.enum(["TRANSFER", "DEPOSIT", "WITHDRAWAL"]),
  amount: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number(value) > 0, "Amount must be positive"),
  note: z.string().trim().max(500, "Note is too long").optional(),
})

type ApprovalFormValues = z.infer<typeof approvalFormSchema>

const approvalDefaultValues: ApprovalFormValues = {
  refId: "",
  requestType: "TRANSFER",
  amount: "",
  note: "",
}

const STATUS_VARIANTS: Partial<
  Record<string, "default" | "success" | "error" | "warning" | "info">
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
}

export function ApprovalsPage() {
  const { t } = useI18n()
  const [level, setLevel] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const {
    data: approvals = [],
    isError: isApprovalsError,
    isLoading,
  } = usePendingApprovals(level)
  const createApproval = useCreateApproval()
  const approveApproval = useApproveApproval()
  const rejectApproval = useRejectApproval()
  const cancelApproval = useCancelApproval()
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
  const [cancelTarget, setCancelTarget] = useState<ApprovalRequest | null>(null)

  useEffect(() => {
    if (isApprovalsError) notify.error("Could not load approvals")
  }, [isApprovalsError])

  const handleCreateOpenChange = (nextOpen: boolean) => {
    setCreateOpen(nextOpen)
    if (!nextOpen) reset(approvalDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await createApproval.mutateAsync({
        ...values,
        amount: values.amount || undefined,
        note: values.note || undefined,
      })
      setCreateOpen(false)
      reset(approvalDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const handleApprove = async (id: string, note: string) => {
    try {
      await approveApproval.mutateAsync({ id, note })
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const handleReject = async (id: string, note: string) => {
    try {
      await rejectApproval.mutateAsync({ id, note })
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelApproval.mutateAsync(id)
      setCancelTarget(null)
    } catch {
      // Mutation hook owns the toast.
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )

  return (
    <Page>
      <PageHeader
        title={t("finance.approvals.title")}
        icon={ShieldCheck}
        badge={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            {approvals.length} pending
          </Badge>
        }
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Level:</span>
              {[1, 2, 3, 4].map((l) => (
                <Button
                  key={l}
                  variant={level === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevel(l)}
                >
                  {l}
                </Button>
              ))}
            </div>
            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger className="h-9 px-4 text-sm">
                Create Approval
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Approval Request</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleCreate}>
                  <FormField label="Reference ID" error={errors.refId?.message}>
                    <Input
                      aria-invalid={Boolean(errors.refId)}
                      {...register("refId")}
                    />
                  </FormField>
                  <FormField
                    label="Request type"
                    error={errors.requestType?.message}
                  >
                    <Controller
                      control={control}
                      name="requestType"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            aria-invalid={Boolean(errors.requestType)}
                          >
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                            <SelectItem value="DEPOSIT">Deposit</SelectItem>
                            <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField label="Amount" error={errors.amount?.message}>
                    <Input
                      aria-invalid={Boolean(errors.amount)}
                      {...register("amount")}
                    />
                  </FormField>
                  <FormField label="Note" error={errors.note?.message}>
                    <Input
                      aria-invalid={Boolean(errors.note)}
                      {...register("note")}
                    />
                  </FormField>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={isSubmitting || createApproval.isPending}
                  >
                    Submit
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <ApprovalsTable
        approvals={approvals}
        approveApproval={approveApproval}
        rejectApproval={rejectApproval}
        cancelApproval={cancelApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={setCancelTarget}
      />

      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm approval cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel approval request{" "}
              {cancelTarget?.refId || cancelTarget?.id || ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={cancelApproval.isPending}
              onClick={() => cancelTarget && handleCancel(cancelTarget.id)}
            >
              Cancel approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

type DecisionAction = "approve" | "reject"

function ApprovalsTable({
  approvals,
  approveApproval,
  rejectApproval,
  cancelApproval,
  onApprove,
  onReject,
  onCancel,
}: {
  approvals: ApprovalRequest[]
  approveApproval: ReturnType<typeof useApproveApproval>
  rejectApproval: ReturnType<typeof useRejectApproval>
  cancelApproval: ReturnType<typeof useCancelApproval>
  onApprove: (id: string, note: string) => void
  onReject: (id: string, note: string) => void
  onCancel: (target: ApprovalRequest) => void
}) {
  const { t } = useI18n()
  const [reviewTarget, setReviewTarget] = useState<ApprovalRequest | null>(null)
  const [decision, setDecision] = useState<DecisionAction>("approve")
  const [note, setNote] = useState("")

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
    if (decision === "approve") onApprove(reviewTarget.id, note)
    else onReject(reviewTarget.id, note)
    closeReview()
  }

  const columns = useMemo<ColumnDef<ApprovalRequest>[]>(
    () => [
      {
        accessorKey: "requestType",
        header: "Type",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.requestType}</span>
        ),
      },
      {
        accessorKey: "refId",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.refId}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.amount
              ? `${Number(row.original.amount).toLocaleString()} ${row.original.currency}`
              : "—"}
          </span>
        ),
      },
      {
        id: "level",
        header: "Level",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.currentLevel}/{row.original.totalLevels}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Status variant={STATUS_VARIANTS[row.original.status] || "default"}>
            <StatusIndicator />
            <StatusLabel>{row.original.status}</StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => openReview(row.original, "approve")}
            >
              Review
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelApproval.isPending}
              onClick={() => onCancel(row.original)}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    [cancelApproval.isPending, onCancel],
  )
  const table = useReactTable({
    data: approvals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <>
      <DataTable table={table} defaultDensity="comfortable" />
      <Dialog open={reviewTarget !== null} onOpenChange={(o) => !o && closeReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approve" ? "Approve" : "Reject"} request
            </DialogTitle>
            <DialogDescription>
              {reviewTarget?.requestType} · Ref {reviewTarget?.refId} · Level{" "}
              {reviewTarget?.currentLevel}/{reviewTarget?.totalLevels}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget?.makerNote ? (
            <p className="text-sm italic text-muted-foreground">
              {reviewTarget.makerNote}
            </p>
          ) : null}
          {reviewTarget?.steps && reviewTarget.steps.length > 0 ? (
            <div className="rounded-md border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Approval History:
              </p>
              {reviewTarget.steps.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span>Level {s.level}:</span>
                  <Status
                    variant={s.decision === "APPROVED" ? "success" : "error"}
                  >
                    <StatusIndicator />
                    <StatusLabel>{s.decision}</StatusLabel>
                  </Status>
                  <span>by {s.checkerId.slice(0, 8)}</span>
                  {s.note && <span>— {s.note}</span>}
                </div>
              ))}
            </div>
          ) : null}
          <FormField label="Note (optional)">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={closeReview}>
              Back
            </Button>
            {decision === "approve" ? (
              <Button
                disabled={approveApproval.isPending}
                onClick={submitReview}
              >
                Approve
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={rejectApproval.isPending}
                onClick={submitReview}
              >
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
