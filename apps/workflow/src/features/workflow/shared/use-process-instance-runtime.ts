import { useCallback, useEffect, useRef, useState } from "react"
import { workflowApi, type ProcessInstanceRuntime } from "../api"

export function useProcessInstanceRuntime(
  processInstanceKey?: string | number
) {
  const key = processInstanceKey ? String(processInstanceKey) : ""
  const [data, setData] = useState<ProcessInstanceRuntime | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [fetching, setFetching] = useState(false)
  const abortRef = useRef<AbortController>(null)

  const reload = useCallback(async () => {
    if (!key) return
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    setFetching(true)
    try {
      const runtime = await workflowApi.getProcessInstanceRuntime(key)
      if (!controller.signal.aborted) {
        setData(runtime)
        setError(null)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (!controller.signal.aborted) {
        setFetching(false)
        setLoading(false)
      }
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    setLoading(true)
    void reload()
    return () => abortRef.current?.abort()
  }, [reload])

  return {
    data,
    isLoading: loading,
    isFetching: fetching,
    error,
    refetch: reload,
  }
}
