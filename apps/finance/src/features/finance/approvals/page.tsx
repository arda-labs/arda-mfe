import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { notify } from "@workspace/notifications/notify"
import type { ApprovalRequest } from "@/features/finance/api"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
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
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useI18n } from "@workspace/i18n"
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

const DEFAULT_PAGE_SIZE = 20

type DecisionAction = "approve" | "reject"

export function ApprovalsPage() {
  const { t } = useI18n()
  const [level, setLevel] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ApprovalRequest | null>(null)
  const [decision, setDecision] = useState<DecisionAction>("approve")
  const [note, setNote] = useState("")
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
    if (decision === "approve") await handleApprove(reviewTarget.id, note)
    else await handleReject(reviewTarget.id, note)
    closeReview()
  }

  const columns = useMemo<ColumnDef<ApprovalRequest>[]>(
    () => [
      {
        id: "requestType",
        accessorKey: "requestType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.type")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("common.field.type"), [
          { label: "Transfer", value: "TRANSFER" },
          { label: "Deposit", value: "DEPOSIT" },
          { label: "Withdrawal", value: "WITHDRAWAL" },
        ]),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.requestType}</span>
        ),
      },
      {
        id: "refId",
        accessorKey: "refId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Reference" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Reference", "Reference"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.refId}</span>
        ),
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Amount" />
        ),
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
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            Level
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.currentLevel}/{row.original.totalLevels}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        cell: ({ row }) => (
          <Status variant={STATUS_VARIANTS[row.original.status] || "default"}>
            <StatusIndicator />
            <StatusLabel>{row.original.status}</StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
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
              onClick={() => setCancelTarget(row.original)}
            >
              {t("common.action.cancel")}
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [cancelApproval.isPending, t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: approvals,
    filterBy: {
      refId: (item, value) => matchTextColumnFilter(value, item.refId),
      requestType: (item, value) =>
        matchSelectFilter(item.requestType, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        requestType: (a, b) => a.requestType.localeCompare(b.requestType),
        refId: (a, b) => a.refId.localeCompare(b.refId),
        amount: (a, b) =>
          Number(a.amount ?? 0) - Number(b.amount ?? 0),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

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

  const handleApprove = async (id: string, reviewNote: string) => {
    try {
      await approveApproval.mutateAsync({ id, note: reviewNote })
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const handleReject = async (id: string, reviewNote: string) => {
    try {
      await rejectApproval.mutateAsync({ id, note: reviewNote })
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

  const levelSelector = (
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
  )

  const dialogs = (
    <>
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("finance.approvals.title")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField label="Reference ID" error={errors.refId?.message}>
              <Input
                aria-invalid={Boolean(errors.refId)}
                {...register("refId")}
              />
            </FormField>
            <FormField
              label={t("common.field.type")}
              error={errors.requestType?.message}
            >
              <Controller
                control={control}
                name="requestType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      aria-invalid={Boolean(errors.requestType)}
                    >
                      <SelectValue placeholder={t("common.field.type")} />
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
              {t("common.action.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(o) => !o && closeReview()}
      >
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
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={closeReview}>
              {t("common.action.back")}
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
            <AlertDialogCancel>{t("common.action.back")}</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={cancelApproval.isPending}
              onClick={() => cancelTarget && handleCancel(cancelTarget.id)}
            >
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
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {total}
        </Badge>
      }
      actions={levelSelector}
      loading={isLoading}
      isEmpty={approvals.length === 0}
      skeletonColumns={6}
      skeletonFilters={2}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("common.action.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
