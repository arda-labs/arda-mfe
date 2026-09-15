import { request, requestList } from "./internal"

export interface ProcessRole {
  id: string
  caseType: string
  stepCode: string
  businessRole: string
  iamRole: string
  actionScope: string
  status: string
}

export interface WorkflowRoleCatalog {
  roleCode: string
  roleName: string
  roleType: string
  businessSubsystem: string
  status: string
}

export interface WorkflowRoleMembership {
  id: string
  roleCode: string
  principalType: string
  principalId: string
  tenantId: string
  orgId: string
  branchId: string
  productCode: string
  minAmount?: number
  maxAmount?: number
  effectiveFrom?: string
  effectiveTo?: string
  status: string
}

export interface WorkflowAssignmentRule {
  id: string
  caseType: string
  stepCode: string
  roleCode: string
  assignmentMode: string
  requireSeparationOfDuties: boolean
  fallbackRoleCode: string
  priority: number
  status: string
}

export interface WorkflowDelegation {
  id: string
  tenantId: string
  fromPrincipalId: string
  toPrincipalId: string
  roleCode: string
  effectiveFrom?: string
  effectiveTo?: string
  reason: string
  status: string
}

export const processRolesApi = {
  async listProcessRoles() {
    return requestList<ProcessRole>("/api/workflow/roles")
  },
  async listRoleCatalog() {
    return requestList<WorkflowRoleCatalog>("/api/workflow/role-catalog")
  },
  async listRoleMemberships(tenantId: string) {
    return requestList<WorkflowRoleMembership>(
      `/api/workflow/role-memberships?tenant_id=${encodeURIComponent(tenantId)}`
    )
  },
  async listAssignmentRules() {
    return requestList<WorkflowAssignmentRule>("/api/workflow/assignment-rules")
  },
  async listDelegations(tenantId: string) {
    return requestList<WorkflowDelegation>(
      `/api/workflow/delegations?tenant_id=${encodeURIComponent(tenantId)}`
    )
  },
  createProcessRole(
    payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">
  ) {
    return request<ProcessRole>("/api/workflow/roles", {
      method: "POST",
      body: payload,
    })
  },
  updateProcessRole(
    id: string,
    payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">
  ) {
    return request<ProcessRole>(
      `/api/workflow/roles/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: payload,
      }
    )
  },
  createRoleCatalog(payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>("/api/workflow/role-catalog", {
      method: "POST",
      body: payload,
    })
  },
  updateRoleCatalog(roleCode: string, payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>(
      `/api/workflow/role-catalog/${encodeURIComponent(roleCode)}`,
      { method: "PUT", body: payload }
    )
  },
  createRoleMembership(
    tenantId: string,
    payload: Omit<WorkflowRoleMembership, "id">
  ) {
    return request<WorkflowRoleMembership>(
      `/api/workflow/role-memberships?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "POST", body: payload }
    )
  },
  updateRoleMembership(
    tenantId: string,
    id: string,
    payload: Omit<WorkflowRoleMembership, "id">
  ) {
    return request<WorkflowRoleMembership>(
      `/api/workflow/role-memberships/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "PUT", body: payload }
    )
  },
  createAssignmentRule(payload: Omit<WorkflowAssignmentRule, "id">) {
    return request<WorkflowAssignmentRule>("/api/workflow/assignment-rules", {
      method: "POST",
      body: payload,
    })
  },
  updateAssignmentRule(
    id: string,
    payload: Omit<WorkflowAssignmentRule, "id">
  ) {
    return request<WorkflowAssignmentRule>(
      `/api/workflow/assignment-rules/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createDelegation(tenantId: string, payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>(
      `/api/workflow/delegations?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "POST", body: payload }
    )
  },
  updateDelegation(
    tenantId: string,
    id: string,
    payload: Omit<WorkflowDelegation, "id">
  ) {
    return request<WorkflowDelegation>(
      `/api/workflow/delegations/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "PUT", body: payload }
    )
  },
}
