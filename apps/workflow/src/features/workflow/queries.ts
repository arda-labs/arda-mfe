import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@workspace/notifications/notify"
import { workflowApi } from "./api"

export const workflowKeys = {
  all: ["workflow"] as const,
  caseTypes: () => [...workflowKeys.all, "case-types"] as const,
  cases: () => [...workflowKeys.all, "cases"] as const,
  slaPolicies: () => [...workflowKeys.all, "sla-policies"] as const,
  descriptionTemplates: () =>
    [...workflowKeys.all, "description-templates"] as const,
  processRoles: () => [...workflowKeys.all, "roles"] as const,
  roleCatalog: () => [...workflowKeys.all, "role-catalog"] as const,
  roleMemberships: () => [...workflowKeys.all, "role-memberships"] as const,
  assignmentRules: () => [...workflowKeys.all, "assignment-rules"] as const,
  delegations: () => [...workflowKeys.all, "delegations"] as const,
  processDefinitions: () => [...workflowKeys.all, "process-definitions"] as const,
  processDefinitionXml: (id: string) =>
    [...workflowKeys.processDefinitions(), id, "xml"] as const,
}

export function useWorkflowCaseTypes() {
  return useQuery({
    queryKey: workflowKeys.caseTypes(),
    queryFn: workflowApi.listCaseTypes,
  })
}

export function useWorkflowCases() {
  return useQuery({
    queryKey: workflowKeys.cases(),
    queryFn: workflowApi.listCases,
  })
}

export function useSlaPolicies() {
  return useQuery({
    queryKey: workflowKeys.slaPolicies(),
    queryFn: workflowApi.listSlaPolicies,
  })
}

export function useDescriptionTemplates() {
  return useQuery({
    queryKey: workflowKeys.descriptionTemplates(),
    queryFn: workflowApi.listDescriptionTemplates,
  })
}

export function useProcessRoles() {
  return useQuery({
    queryKey: workflowKeys.processRoles(),
    queryFn: workflowApi.listProcessRoles,
  })
}

export function useRoleCatalog() {
  return useQuery({
    queryKey: workflowKeys.roleCatalog(),
    queryFn: workflowApi.listRoleCatalog,
  })
}

export function useRoleMemberships() {
  return useQuery({
    queryKey: workflowKeys.roleMemberships(),
    queryFn: workflowApi.listRoleMemberships,
  })
}

export function useAssignmentRules() {
  return useQuery({
    queryKey: workflowKeys.assignmentRules(),
    queryFn: workflowApi.listAssignmentRules,
  })
}

export function useDelegations() {
  return useQuery({
    queryKey: workflowKeys.delegations(),
    queryFn: workflowApi.listDelegations,
  })
}

export function useProcessDefinitions() {
  return useQuery({
    queryKey: workflowKeys.processDefinitions(),
    queryFn: workflowApi.listProcessDefinitions,
  })
}

export function useProcessDefinitionXml(id?: string, enabled = true) {
  return useQuery({
    queryKey: workflowKeys.processDefinitionXml(id ?? ""),
    queryFn: () => workflowApi.getProcessDefinitionXml(id ?? ""),
    enabled: Boolean(id) && enabled,
  })
}

export function useSaveCaseType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      caseType?: string
      payload: Parameters<typeof workflowApi.createCaseType>[0]
    }) =>
      input.caseType
        ? workflowApi.updateCaseType(input.caseType, input.payload)
        : workflowApi.createCaseType(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.caseTypes() }),
  })
}

export function useUpdateProcessConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      caseType: string
      payload: Parameters<typeof workflowApi.updateProcessConfig>[1]
    }) => workflowApi.updateProcessConfig(input.caseType, input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.caseTypes() }),
  })
}

export function useSaveSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createSlaPolicy>[0]
    }) =>
      input.id
        ? workflowApi.updateSlaPolicy(input.id, input.payload)
        : workflowApi.createSlaPolicy(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.slaPolicies() }),
  })
}

export function useSaveDescriptionTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createDescriptionTemplate>[0]
    }) =>
      input.id
        ? workflowApi.updateDescriptionTemplate(input.id, input.payload)
        : workflowApi.createDescriptionTemplate(input.payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowKeys.descriptionTemplates() }),
  })
}

export function useSaveProcessRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createProcessRole>[0]
    }) =>
      input.id
        ? workflowApi.updateProcessRole(input.id, input.payload)
        : workflowApi.createProcessRole(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.processRoles() }),
  })
}

export function useSaveRoleCatalog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      roleCode?: string
      payload: Parameters<typeof workflowApi.createRoleCatalog>[0]
    }) =>
      input.roleCode
        ? workflowApi.updateRoleCatalog(input.roleCode, input.payload)
        : workflowApi.createRoleCatalog(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.roleCatalog() }),
  })
}

export function useSaveRoleMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createRoleMembership>[0]
    }) =>
      input.id
        ? workflowApi.updateRoleMembership(input.id, input.payload)
        : workflowApi.createRoleMembership(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.roleMemberships() }),
  })
}

export function useSaveAssignmentRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createAssignmentRule>[0]
    }) =>
      input.id
        ? workflowApi.updateAssignmentRule(input.id, input.payload)
        : workflowApi.createAssignmentRule(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.assignmentRules() }),
  })
}

export function useSaveDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      payload: Parameters<typeof workflowApi.createDelegation>[0]
    }) =>
      input.id
        ? workflowApi.updateDelegation(input.id, input.payload)
        : workflowApi.createDelegation(input.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.delegations() }),
  })
}

export function useImportProcessDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workflowApi.importProcessDefinition,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowKeys.processDefinitions() }),
  })
}

export function useUpdateProcessDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      payload: Parameters<typeof workflowApi.updateProcessDefinition>[1]
    }) => workflowApi.updateProcessDefinition(input.id, input.payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowKeys.processDefinitions() }),
  })
}

export function useDeployProcessDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workflowApi.deployProcessDefinition,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowKeys.processDefinitions() }),
  })
}

export function useDeleteProcessDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workflowApi.deleteProcessDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.processDefinitions() })
      notify.success("Đã xóa định nghĩa quy trình")
    },
    onError: (error) =>
      notify.error(
        "Xóa định nghĩa quy trình thất bại",
        error instanceof Error ? error.message : String(error)
      ),
  })
}
