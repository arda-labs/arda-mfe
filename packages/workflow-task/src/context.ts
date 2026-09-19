import { useEffect, useState } from "react"
import type { WorkflowTask } from "./types"

/**
 * Shared task-context primitives: URL parsing helpers, the deep-link work-item
 * fetch, and the claim retry loop that absorbs Zeebe projector latency after a
 * non-blocking submit. CRM and loan used to carry byte-identical copies.
 */

/** Normalize a Zeebe key (string | number | null) to a non-empty string. */
export function workflowKey(
  value: string | number | null | undefined
): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

/** Trimmed search param; empty values become null. */
export function stringParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim()
  return value || null
}

/** Screens opened from search pass `mode=view` — no claim, no actions. */
export function isViewOnlyTaskContext(): boolean {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "view"
  )
}

/**
 * Fetch one work item by id (deep-link `?workItemId=`). Pass a stable `load`
 * reference (a module-level api method) so the effect only re-runs when the id
 * changes.
 */
export function useWorkItemContext<T>(
  workItemId: string | null,
  load: (id: string) => Promise<T>
) {
  const [state, setState] = useState<{
    id: string | null
    item: T | null
    isError: boolean
  }>({ id: null, item: null, isError: false })

  useEffect(() => {
    if (!workItemId) return
    let cancelled = false
    load(workItemId)
      .then((item) => {
        if (!cancelled) setState({ id: workItemId, item, isError: false })
      })
      .catch(() => {
        if (!cancelled) setState({ id: workItemId, item: null, isError: true })
      })
    return () => {
      cancelled = true
    }
  }, [workItemId, load])

  // The stored snapshot belongs to another id until its fetch resolves; while
  // it does (or when there is no id) the derived state is idle/loading.
  if (state.id !== workItemId) {
    return { item: null, isLoading: Boolean(workItemId), isError: false }
  }
  return { item: state.item, isLoading: false, isError: state.isError }
}

/**
 * Claim a user task with a delay between attempts — Zeebe may still be
 * projecting the job right after a non-blocking submit. `onLastError` runs
 * only after the final attempt so expected early failures stay silent.
 */
export async function claimWithRetry(options: {
  attempts: number
  delayMs: number
  claim: () => Promise<WorkflowTask>
  onLastError: (error: unknown) => void
}): Promise<WorkflowTask | null> {
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    }
    try {
      return await options.claim()
    } catch (error) {
      if (attempt === options.attempts - 1) {
        options.onLastError(error)
      }
    }
  }
  return null
}
