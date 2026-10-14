import { useRef } from "react"
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
      pending = [...pending, ...ids]
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
 * an unsaved form): the first save of the current form ("" -> id) is the same
 * customer, so staged photos survive it; any other change (A -> B, A -> "")
 * means the page was reused for a different customer and must start clean. */
export function shouldResetStaging(prevKey: string, nextKey: string): boolean {
  return prevKey !== "" && prevKey !== nextKey
}

export function useIdentityImageStaging(caseId: string | null | undefined, customerKey: string) {
  const caseIdRef = useRef(caseId)
  caseIdRef.current = caseId
  const scope = useRef<{ key: string; staging: ReturnType<typeof createIdentityImageStaging> } | null>(null)
  if (!scope.current || shouldResetStaging(scope.current.key, customerKey)) {
    scope.current = {
      key: customerKey,
      staging: createIdentityImageStaging(attachStagedCaseFiles, () => caseIdRef.current),
    }
  } else {
    scope.current.key = customerKey
  }
  // saveAndSubmit closes over the object from the render that started it, so
  // its flush still sees this customer's pending ids after later renders.
  return scope.current.staging
}
