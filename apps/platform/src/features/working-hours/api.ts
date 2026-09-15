import {
  deleteCanonical,
  getCanonicalList,
  postCanonical,
} from "@workspace/api"
import type { WorkingHour } from "./types"

export function listWorkingHours(orgCode = "") {
  return getCanonicalList<WorkingHour>(
    `/api/platform/working-hours${orgCode ? `?org_code=${encodeURIComponent(orgCode)}` : ""}`
  )
}

export function upsertWorkingHour(body: Partial<WorkingHour>) {
  return postCanonical<WorkingHour>("/api/platform/working-hours", body)
}

export function deleteWorkingHour(id: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/platform/working-hours/${encodeURIComponent(id)}`
  )
}
