import { useCallback, useRef } from "react"
import { attachStagedCaseFiles } from "@workspace/case-tabs"

type Attach = (ids: string[], caseId: string) => Promise<void>

/** Card photos are uploaded as temp files right after a scan; they join the
 * registration case now if it exists, else when submit creates it. Temp
 * files never attached are removed by media-service's temp cleaner.
 * `getCaseId` is read at stage time (not apply time) and `flush` records the
 * case it attached to, so photos finishing uploading after submit created the
 * case attach immediately instead of being queued forever. */
export function createIdentityImageStaging(
  attach: Attach,
  getCaseId: () => string | null | undefined = () => null
) {
  let pending: string[] = []
  let flushedCaseId: string | null = null
  return {
    async stage(ids: string[]): Promise<"attached" | "staged"> {
      const caseId = getCaseId() ?? flushedCaseId
      if (caseId) {
        await attach(ids, caseId)
        return "attached"
      }
      // The latest applied scan is the one whose data is in the form, so a
      // re-scan replaces earlier photos instead of piling onto them.
      pending = [...ids]
      return "staged"
    },
    async flush(caseId: string | null | undefined): Promise<number> {
      if (!caseId) return 0
      flushedCaseId = caseId
      if (pending.length === 0) return 0
      const ids = pending
      pending = []
      await attach(ids, caseId)
      return ids.length
    },
  }
}

/** Staging belongs to one customer. The key is the saved customer id ("" for
 * an unsaved form). The only key change that keeps staging is the first save
 * of the current form ("" -> id), recognised because the page `claim`ed that
 * id when it saved; any other change (A -> B, A -> "", "" -> B that was merely
 * loaded, e.g. New registration then browser Back) starts clean. */
export function shouldResetStaging(prevKey: string, nextKey: string, claimed: string | null): boolean {
  return prevKey !== nextKey && !(prevKey === "" && nextKey === claimed)
}

type Staging = ReturnType<typeof createIdentityImageStaging>

/** Pure scope bookkeeping behind the hook. A scope captured by an in-flight
 * upload only sees the live case id while it is still the current scope, so a
 * late upload for a previous customer never attaches to the new customer's
 * case. */
export function createStagingScopes(attach: Attach, getLiveCaseId: () => string | null | undefined) {
  type Scope = { key: string; claimed: string | null; staging: Staging }
  let scope: Scope | null = null
  const make = (key: string): Scope => {
    const s: Scope = {
      key,
      claimed: null,
      staging: createIdentityImageStaging(attach, () => (scope === s ? getLiveCaseId() : null)),
    }
    return s
  }
  return {
    current(key: string): Staging {
      if (!scope || shouldResetStaging(scope.key, key, scope.claimed)) {
        scope = make(key)
      } else {
        scope.key = key
      }
      return scope.staging
    },
    claim(id: string) {
      if (scope) scope.claimed = id
    },
  }
}

export function useIdentityImageStaging(caseId: string | null | undefined, customerKey: string) {
  const caseIdRef = useRef(caseId)
  caseIdRef.current = caseId
  const scopes = useRef<ReturnType<typeof createStagingScopes> | null>(null)
  if (!scopes.current) {
    scopes.current = createStagingScopes(attachStagedCaseFiles, () => caseIdRef.current)
  }
  const staging = scopes.current.current(customerKey)
  // Stable: the page calls it from save paths (refreshCustomer) to mark the
  // id the current form was just saved as.
  const claim = useCallback((id: string) => scopes.current?.claim(id), [])
  // saveAndSubmit closes over the staging from the render that started it, so
  // its flush still sees this customer's pending ids after later renders.
  return { stage: staging.stage, flush: staging.flush, claim }
}
