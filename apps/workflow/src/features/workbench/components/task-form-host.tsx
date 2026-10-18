import { useCaseTabs } from "@workspace/case-tabs"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import type { TaskFormSubmit } from "@workspace/workflow-task"
import type { WorkItem } from "../api"
import type { TaskFormRemote } from "../utils/task-form-routing"
import { CaseReviewLayout } from "./case-review-layout"
import { CaseTabsPanel } from "./case-tabs-panel"
import { loadTaskFormForLocale, useTaskForm } from "./use-task-form"

/**
 * Server-driven task form host: resolves the form by the work item's
 * `formKey`, registers the owner remote's locale bundle, passes the case
 * variables as `data`, and forwards the submitted action to the workbench
 * complete-task pipeline.
 */
export function TaskFormHost({
  item,
  submitting,
  onClose,
  onSubmit,
}: {
  item: WorkItem | null
  submitting: boolean
  onClose: () => void
  onSubmit: (submission: TaskFormSubmit) => void | Promise<void>
}) {
  const { t } = useI18n()
  const { form, data, state, retry } = useTaskForm(item)
  const caseTabs = useCaseTabs({ caseId: item?.caseId, canUpload: false })

  const Form = form

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent
        className={item?.caseId ? "sm:max-w-3xl lg:max-w-5xl" : "sm:max-w-3xl"}
      >
        <DialogHeader>
          <DialogTitle>{t("workflow.workbench.task_form.title")}</DialogTitle>
          <DialogDescription>
            {item ? `${item.caseCode} — ${item.title}` : ""}
          </DialogDescription>
        </DialogHeader>

        {state === "loading" ? (
          <div className="space-y-3 py-4" aria-label={t("workflow.workbench.task_form.loading")}>
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </div>
        ) : null}

        {state === "unsupported" ? (
          <div className="space-y-3">
            <p className="rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
              {t("workflow.workbench.task_form.unsupported")}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("workflow.workbench.task_form.close")}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="space-y-3">
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {t("workflow.workbench.task_form.load_error")}
            </p>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("workflow.workbench.task_form.close")}
              </Button>
              <Button type="button" onClick={retry}>
                {t("workflow.workbench.task_form.retry")}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {state === "ready" && Form && item ? (
          <DialogBody className="py-3">
            <CaseReviewLayout caseId={item.caseId}>
              <Form
                task={item}
                mode="act"
                data={data}
                submitting={submitting}
                onSubmit={onSubmit}
                onReturn={onClose}
              />
              <CaseTabsPanel tabs={caseTabs} />
            </CaseReviewLayout>
          </DialogBody>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function preloadTaskFormRemote(remote: TaskFormRemote, locale: string) {
  return loadTaskFormForLocale(remote, locale)
}
