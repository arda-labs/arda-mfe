import { useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  allowedActions,
  isMakerStep,
  requiresComment,
  TASK_ACTIONS,
} from "./actions"
import type { TaskFormProps, WorkflowTaskAction } from "./types"

/**
 * Labels the host app supplies (the package owns no locale bundle). Keeping
 * copy as props is what makes this component presentational-only and safe to
 * bundle per remote.
 */
export interface TaskDecisionLabels {
  commentLabel: string
  commentPlaceholder: string
  close: string
  confirm: string
  approve: string
  requestChanges: string
  reject: string
  viewOnly: string
  commentRequired: string
}

/**
 * The action set the current step allows, taken from the server registry
 * metadata; when the registry is silent, fall back to the maker/checker shape.
 * There is no case-type fallback — a step with no metadata still gets the
 * canonical maker or checker actions.
 */
export function taskDecisionActions(
  task: TaskFormProps["task"]
): WorkflowTaskAction[] {
  const server = allowedActions(task)
  if (server.length) return server
  return isMakerStep(task)
    ? [TASK_ACTIONS.submit]
    : [TASK_ACTIONS.approve, TASK_ACTIONS.requestChanges, TASK_ACTIONS.reject]
}

/** Comment + action state shared by every domain task form. */
export function useTaskDecision({
  task,
  commentRequiredLabel,
  onSubmit,
}: {
  task: TaskFormProps["task"]
  commentRequiredLabel: string
  onSubmit: (
    action: WorkflowTaskAction,
    comment: string
  ) => void | Promise<void>
}) {
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(commentRequiredLabel)
      return
    }
    setError("")
    void onSubmit(action, trimmed)
  }

  return {
    actions: taskDecisionActions(task),
    maker: isMakerStep(task),
    comment,
    error,
    setComment: (value: string) => {
      setComment(value)
      setError("")
    },
    submit,
  }
}

/**
 * Shared decision bar: optional comment box, the ordered action buttons and the
 * view-only notice. Forms render their dossier above it and pass the state from
 * `useTaskDecision`.
 */
export function TaskDecisionBar({
  actions,
  labels,
  readOnly = false,
  submitting = false,
  showComment = false,
  comment,
  onCommentChange,
  commentError,
  onSubmit,
  onReturn,
}: {
  actions: WorkflowTaskAction[]
  labels: TaskDecisionLabels
  readOnly?: boolean
  submitting?: boolean
  showComment?: boolean
  comment: string
  onCommentChange: (value: string) => void
  commentError?: string
  onSubmit: (action: WorkflowTaskAction) => void
  onReturn: () => void
}) {
  const disabled = submitting || readOnly
  const ordered = [
    ...actions.filter((action) => action === TASK_ACTIONS.requestChanges),
    ...actions.filter((action) => action === TASK_ACTIONS.reject),
    ...actions.filter(
      (action) =>
        action !== TASK_ACTIONS.requestChanges && action !== TASK_ACTIONS.reject
    ),
  ]

  function button(action: WorkflowTaskAction) {
    switch (action) {
      case TASK_ACTIONS.submit:
      case TASK_ACTIONS.approve:
        return (
          <Button
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(action)}
          >
            <Check className="size-4" />
            {action === TASK_ACTIONS.submit ? labels.confirm : labels.approve}
          </Button>
        )
      case TASK_ACTIONS.requestChanges:
        return (
          <Button
            key={action}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSubmit(action)}
          >
            <MessageSquareWarning className="size-4" />
            {labels.requestChanges}
          </Button>
        )
      case TASK_ACTIONS.reject:
        return (
          <Button
            key={action}
            type="button"
            variant="destructive"
            disabled={disabled}
            onClick={() => onSubmit(action)}
          >
            <X className="size-4" />
            {labels.reject}
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <>
      {showComment && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="task-decision-comment">{labels.commentLabel}</Label>
          <Textarea
            id="task-decision-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={labels.commentPlaceholder}
            onChange={(event) => onCommentChange(event.target.value)}
          />
          {commentError ? (
            <p className="text-sm text-destructive">{commentError}</p>
          ) : null}
        </div>
      ) : null}

      {readOnly ? (
        <p className="text-sm text-muted-foreground">{labels.viewOnly}</p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onReturn}
        >
          {labels.close}
        </Button>
        {readOnly ? null : ordered.map(button)}
      </div>
    </>
  )
}
