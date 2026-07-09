import { useEffect, useState } from "react"
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
import { buttonVariants } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

export type CheckerDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT"

const decisionCopy: Record<
  Exclude<CheckerDecision, "APPROVE">,
  { title: string; description: string; confirm: string; destructive?: boolean }
> = {
  REQUEST_CHANGES: {
    title: "Yêu cầu chỉnh sửa",
    description:
      "Maker sẽ nhận thông báo in-app và phải bổ sung hồ sơ trước khi gửi lại.",
    confirm: "Gửi yêu cầu chỉnh sửa",
  },
  REJECT: {
    title: "Từ chối đăng ký",
    description:
      "Hồ sơ sẽ bị hủy (REJECTED). Maker nhận thông báo; không thể chỉnh sửa tiếp trên case này.",
    confirm: "Xác nhận từ chối",
    destructive: true,
  },
}

export function CheckerDecisionDialog({
  decision,
  open,
  submitting,
  onOpenChange,
  onConfirm,
}: {
  decision: Exclude<CheckerDecision, "APPROVE"> | null
  open: boolean
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState("")
  const copy = decision ? decisionCopy[decision] : null
  const trimmed = comment.trim()

  useEffect(() => {
    if (!open) setComment("")
  }, [open, decision])

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setComment("")
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            htmlFor="checker-review-comment"
          >
            Lý do <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="checker-review-comment"
            rows={4}
            value={comment}
            disabled={submitting}
            placeholder="Nhập lý do để maker hiểu cần sửa gì..."
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || !trimmed}
            className={cn(
              copy?.destructive &&
                buttonVariants({ variant: "destructive" })
            )}
            onClick={(e) => {
              e.preventDefault()
              if (!trimmed || submitting) return
              onConfirm(trimmed)
            }}
          >
            {copy?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
