import { useEffect, useState } from "react"
import { useCaseTabs } from "@workspace/case-tabs"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  registryFromModule,
  resolveTaskForm,
  type TaskFormComponent,
  type TaskFormModule,
  type TaskFormSubmit,
} from "@workspace/workflow-task"
import type { WorkItem } from "../api"
import { workbenchApi } from "../api"
import { taskFormRemoteFor, type TaskFormRemote } from "../utils/task-form-routing"

const moduleLoaders: Record<TaskFormRemote, () => Promise<TaskFormModule>> = {
  deposit: () => import("deposit/taskForms"),
  capital: () => import("capital/taskForms"),
  loan: () => import("loan/taskForms"),
}

const moduleCache = new Map<TaskFormRemote, Promise<TaskFormModule>>()

function loadTaskFormModule(remote: TaskFormRemote): Promise<TaskFormModule> {
  const cached = moduleCache.get(remote)
  if (cached) return cached
  const load = moduleLoaders[remote]().catch((error: unknown) => {
    moduleCache.delete(remote) // failures stay retryable
    throw error
  })
  moduleCache.set(remote, load)
  return load
}

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
  const { t, locale } = useI18n()
  const [form, setForm] = useState<TaskFormComponent | null>(null)
  const [data, setData] = useState<Record<string, unknown> | undefined>(
    undefined
  )
  const [state, setState] = useState<
    "loading" | "ready" | "unsupported" | "error"
  >("loading")
  const [attempt, setAttempt] = useState(0)

  const remote = item ? taskFormRemoteFor(item.caseType) : undefined
  const caseTabs = useCaseTabs({ caseId: item?.caseId, canUpload: false })

  useEffect(() => {
    if (!item || !remote) return
    let cancelled = false
    setState("loading")
    setForm(null)
    setData(undefined)
    void (async () => {
      try {
        const module = await loadTaskFormModule(remote)
        await module.locales?.preload(locale)
        const component = resolveTaskForm(
          registryFromModule(module),
          item.formKey
        )
        if (!component) {
          if (!cancelled) setState("unsupported")
          return
        }
        const caseVars = await workbenchApi
          .getCaseVariables(item.caseId)
          .catch(() => undefined)
        if (cancelled) return
        setData(caseVars?.variables)
        setForm(() => component)
        setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [item, remote, locale, attempt])

  const Form = form

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("workflow.workbench.task_form.title")}</DialogTitle>
          <DialogDescription>
            {item ? `${item.caseCode} — ${item.title}` : ""}
          </DialogDescription>
        </DialogHeader>

        {state === "loading" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("workflow.workbench.task_form.loading")}
          </p>
        ) : null}

        {state === "unsupported" ? (
          <div className="space-y-3">
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
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
              <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
                {t("workflow.workbench.task_form.retry")}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {state === "ready" && Form && item ? (
          <>
            <Form
              task={item}
              mode="act"
              data={data}
              submitting={submitting}
              onSubmit={onSubmit}
              onReturn={onClose}
            />
            {caseTabs.length > 0 ? (
              <Tabs
                defaultValue={caseTabs[0]?.id}
                className="flex flex-col gap-2 pt-2"
              >
                <TabsList className="h-auto w-fit">
                  {caseTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {caseTabs.map((tab) => (
                  <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="mt-0 max-h-80 overflow-y-auto"
                  >
                    {tab.content}
                  </TabsContent>
                ))}
              </Tabs>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
