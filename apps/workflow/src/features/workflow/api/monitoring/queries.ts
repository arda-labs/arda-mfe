/**
 * Query inputs for the Operate (runtime monitoring) search endpoints.
 * Leaf module: shared by internal query builders and the monitoring API
 * modules without creating import cycles.
 */

export interface OperateInstanceQuery {
  state?: string
  bpmnProcessId?: string
  processDefinitionKey?: string
  processInstanceKey?: string
  parentProcessInstanceKey?: string
  startFrom?: string
  startTo?: string
  pageSize?: number
  cursor?: string
}

export interface OperateIncidentQuery {
  state?: string
  errorType?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  from?: string
  to?: string
  pageSize?: number
  cursor?: string
}

export interface OperateJobQuery {
  state?: string
  type?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  elementId?: string
  pageSize?: number
  cursor?: string
}

export interface OperateUserTaskQuery {
  state?: string
  assignee?: string
  candidateGroup?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  elementId?: string
  pageSize?: number
  cursor?: string
}
