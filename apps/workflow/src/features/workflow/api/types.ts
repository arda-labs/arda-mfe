/**
 * Cross-module wire types for the workflow feature API.
 * Wire source: arda-be/apps/workflow-service (process definitions, catalog lists).
 */

export interface WorkflowProcessDefinition {
  id: string
  processCode: string
  name: string
  bpmnProcessId: string
  version: number
  resourceName: string
  xmlContent?: string
  deploymentKey?: number
  status: string
  deployedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type ProcessDefinitionUploadPayload = {
  processCode?: string
  name: string
  status: string
  file: File
}

/** Shared list query params supported by workflow catalog list endpoints. */
export interface WorkflowListParams {
  q?: string
  sort?: string
  order?: "asc" | "desc"
}
