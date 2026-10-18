import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  registryFromModule,
  resolveTaskForm,
  type TaskFormComponent,
  type TaskFormModule,
} from "@workspace/workflow-task"
import type { WorkItem } from "../api"
import { workbenchApi } from "../api"
import { taskFormRemoteFor, type TaskFormRemote } from "../utils/task-form-routing"
import { taskFormModules } from "./task-form-modules.generated"

const moduleLoaders: Record<TaskFormRemote, () => Promise<TaskFormModule>> = taskFormModules

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

export function loadTaskFormForLocale(
  remote: TaskFormRemote,
  locale: string
): Promise<TaskFormModule> {
  return loadTaskFormModule(remote).then(async (module) => {
    await module.locales?.preload(locale)
    return module
  })
}

export type TaskFormState = "loading" | "ready" | "unsupported" | "error"

/**
 * Resolves the server-driven form for a work item (owner remote's module +
 * locale bundle, form by `formKey`) and fetches the case variables as `data`.
 *
 * `tolerateMissingData` is for read-only screens: a closed case may no longer
 * have live Zeebe variables, so a failed variables call still renders the form
 * (with `data` undefined) instead of reporting an error. The acting host keeps
 * the strict default because a decision must not be made without the payload.
 */
export function useTaskForm(
  item: WorkItem | null | undefined,
  options: { tolerateMissingData?: boolean } = {}
) {
  const { locale } = useI18n()
  const { tolerateMissingData = false } = options
  const [form, setForm] = useState<TaskFormComponent | null>(null)
  const [data, setData] = useState<Record<string, unknown> | undefined>(undefined)
  const [state, setState] = useState<TaskFormState>("loading")
  const [attempt, setAttempt] = useState(0)

  const remote = item ? taskFormRemoteFor(item.caseType) : undefined

  useEffect(() => {
    if (!item || !remote) return
    let cancelled = false
    setState("loading")
    setForm(null)
    setData(undefined)
    void (async () => {
      try {
        const [module, caseVars] = await Promise.all([
          loadTaskFormForLocale(remote, locale),
          tolerateMissingData
            ? workbenchApi.getCaseVariables(item.caseId).catch(() => undefined)
            : workbenchApi.getCaseVariables(item.caseId),
        ])
        const component = resolveTaskForm(
          registryFromModule(module),
          item.formKey
        )
        if (!component) {
          if (!cancelled) setState("unsupported")
          return
        }
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
  }, [item, remote, locale, attempt, tolerateMissingData])

  return {
    form,
    data,
    state,
    hasRemote: Boolean(remote),
    retry: () => setAttempt((n) => n + 1),
  }
}
