import { useCallback, useEffect, useMemo, useState } from "react"
import { api, type ApiSuccess } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { hasPermission, useAuthStore } from "./store"

export type OrganizationOption = {
  id: string
  code?: string
  name: string
}

type OrganizationOptionsState = {
  organizations: OrganizationOption[]
  loading: boolean
  failed: boolean
  reload: () => void
}

type FetchState = {
  key: string
  status: "ready" | "failed"
  options?: OrganizationOption[]
}

function toIdOptions(orgIds: string[]): OrganizationOption[] {
  return orgIds.map((id) => ({ id, name: id }))
}

// The organization directory requires `platform.read`, which most business
// users do not hold. Fall back to the raw org IDs from the session so selecting
// a branch never depends on an admin permission.
export function useOrganizationOptions(
  orgIds: string[],
  enabled = true
): OrganizationOptionsState {
  const user = useAuthStore((state) => state.user)
  const canReadDirectory = hasPermission(user, "platform.read")
  const orgIdsKey = orgIds.join(",")
  const [reloadToken, setReloadToken] = useState(0)
  const [fetchState, setFetchState] = useState<FetchState | null>(null)

  const ids = useMemo(
    () => (orgIdsKey ? orgIdsKey.split(",") : []),
    [orgIdsKey]
  )
  const fallback = useMemo(() => toIdOptions(ids), [ids])
  const shouldFetch = enabled && canReadDirectory && ids.length > 0
  const requestKey = `${orgIdsKey}|${reloadToken}`
  const matchesRequest = fetchState?.key === requestKey
  const loading = shouldFetch && (!matchesRequest || !fetchState)
  const failed =
    shouldFetch && matchesRequest && fetchState?.status === "failed"
  const remoteOptions =
    shouldFetch && matchesRequest && fetchState?.status === "ready"
      ? fetchState.options
      : undefined

  useEffect(() => {
    if (!shouldFetch || !orgIdsKey) return
    let cancelled = false
    api
      .get<ApiSuccess<ListResponse<OrganizationOption>>>(
        "/api/platform/organizations?view=options"
      )
      .then(({ result }) => {
        if (cancelled) return
        const allowed = new Set(orgIdsKey.split(","))
        const options = result.items
          .filter((org) => allowed.has(org.id))
          .map((org) => ({ id: org.id, code: org.code, name: org.name }))
        setFetchState({ key: requestKey, status: "ready", options })
      })
      .catch(() => {
        if (cancelled) return
        setFetchState({ key: requestKey, status: "failed" })
      })
    return () => {
      cancelled = true
    }
  }, [orgIdsKey, requestKey, shouldFetch])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return {
    organizations:
      remoteOptions && remoteOptions.length > 0 ? remoteOptions : fallback,
    loading,
    failed,
    reload,
  }
}
