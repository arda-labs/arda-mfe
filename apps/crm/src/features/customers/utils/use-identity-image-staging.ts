import { useMemo } from "react"
import { attachStagedCaseFiles } from "@workspace/case-tabs"

type Attach = (ids: string[], caseId: string) => Promise<void>

/** Card photos are uploaded as temp files right after a scan; they join the
 * registration case now if it exists, else when submit creates it. Temp
 * files never attached are removed by media-service's temp cleaner. */
export function createIdentityImageStaging(attach: Attach) {
  let pending: string[] = []
  return {
    async stage(ids: string[], caseId: string | null): Promise<"attached" | "staged"> {
      if (caseId) {
        await attach(ids, caseId)
        return "attached"
      }
      pending = [...pending, ...ids]
      return "staged"
    },
    async flush(caseId: string | null | undefined): Promise<number> {
      if (!caseId || pending.length === 0) return 0
      const ids = pending
      pending = []
      await attach(ids, caseId)
      return ids.length
    },
  }
}

export function useIdentityImageStaging() {
  return useMemo(() => createIdentityImageStaging(attachStagedCaseFiles), [])
}
