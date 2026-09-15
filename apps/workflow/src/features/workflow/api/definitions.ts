import { request, requestList, requestText } from "./internal"
import type {
  ProcessDefinitionUploadPayload,
  WorkflowProcessDefinition,
} from "./types"

async function uploadProcessDefinition(
  path: string,
  method: "POST" | "PUT",
  payload: ProcessDefinitionUploadPayload
) {
  const body = new FormData()
  if (payload.processCode) body.set("processCode", payload.processCode)
  body.set("name", payload.name)
  body.set("status", payload.status)
  body.set("file", payload.file)

  return method === "POST"
    ? request<WorkflowProcessDefinition>(path, { method, body })
    : request<WorkflowProcessDefinition>(path, { method, body })
}

export const definitionsApi = {
  async listProcessDefinitions() {
    return requestList<WorkflowProcessDefinition>(
      "/api/workflow/process-definitions"
    )
  },
  getProcessDefinitionXml(id: string) {
    return requestText(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}/xml`
    )
  },
  importProcessDefinition(payload: ProcessDefinitionUploadPayload) {
    return uploadProcessDefinition(
      "/api/workflow/process-definitions",
      "POST",
      payload
    )
  },
  updateProcessDefinition(id: string, payload: ProcessDefinitionUploadPayload) {
    return uploadProcessDefinition(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}`,
      "PUT",
      payload
    )
  },
  deployProcessDefinition(id: string) {
    return request<WorkflowProcessDefinition>(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}/deploy`,
      { method: "POST" }
    )
  },
  deleteProcessDefinition(id: string) {
    return request<void>(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    )
  },
}
