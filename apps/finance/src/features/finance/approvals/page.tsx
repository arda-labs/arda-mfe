import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
  const [note, setNote] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
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

  const handleApprove = async (id: string) => {
    try {
      await approveApproval.mutateAsync({ id, note })
      setActionId(null)
      setNote("")
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectApproval.mutateAsync({ id, note })
      setActionId(null)
      setNote("")
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            Pending approvals
          </Badge>
        </div>
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
      </div>

      <div className="space-y-3">
        {approvals.length === 0 && (
          <p className="text-muted-foreground">
            No pending approvals at level {level}.
          </p>
        )}
        {approvals.map((a) => (
          <div key={a.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.requestType}</span>
                  <Status variant={STATUS_VARIANTS[a.status] || "default"}>
                    <StatusIndicator />
                    <StatusLabel>{a.status}</StatusLabel>
                  </Status>
                  <span className="text-xs text-muted-foreground">
                    Level {a.currentLevel}/{a.totalLevels}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ref: {a.refId} · Amount:{" "}
                  {a.amount
                    ? `${Number(a.amount).toLocaleString()} ${a.currency}`
                    : "—"}
                </p>
                {a.makerNote && <p className="text-sm italic">{a.makerNote}</p>}
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>

              {actionId === a.id ? (
                <div className="flex flex-col items-end gap-2">
                  <Input
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-48"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={approveApproval.isPending}
                      onClick={() => handleApprove(a.id)}
                    >
                      ✅ Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={rejectApproval.isPending}
                      onClick={() => handleReject(a.id)}
                    >
                      ❌ Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActionId(null)}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setActionId(a.id)}
                  >
                    Review
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelApproval.isPending}
                    onClick={() => setCancelTarget(a)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {a.steps && a.steps.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Approval History:
                </p>
                {a.steps.map((s) => (
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
            )}
          </div>
        ))}
      </div>

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
    </div>
  )
}
