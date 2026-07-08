import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@workspace/notifications/notify"
import {
  workbenchApi,
  type ClaimWorkItemRequest,
  type WorkbenchDirection,
  type WorkItemFilter,
  type WorkflowCaseSearchParams,
  type WorkflowTaskRequest,
} from "./api"

type WorkItemQueryOptions = {
  enabled?: boolean
  refetchInterval?: number | false
  refetchIntervalInBackground?: boolean
}

export const workbenchKeys = {
  all: ["workflow", "workbench"] as const,
  direction: (direction: WorkbenchDirection) =>
    [...workbenchKeys.all, "direction", direction] as const,
  search: (params: WorkflowCaseSearchParams) =>
    [...workbenchKeys.all, "search", params] as const,
  tasks: (input: WorkflowTaskRequest) =>
    [...workbenchKeys.all, "tasks", input.taskType, input.role] as const,
  workItemsRoot: () => [...workbenchKeys.all, "work-items"] as const,
  workItems: (filter: WorkItemFilter = {}) =>
    [...workbenchKeys.workItemsRoot(), filter] as const,
  workItemSummary: (filter: WorkItemFilter = {}) =>
    [...workbenchKeys.workItemsRoot(), "summary", filter] as const,
}

export function useWorkItems(
  filter: WorkItemFilter = {},
  options: WorkItemQueryOptions = {}
) {
  return useQuery({
    queryKey: workbenchKeys.workItems(filter),
    queryFn: () => workbenchApi.listWorkItems(filter),
    refetchOnMount: "always",
    staleTime: 0,
    ...options,
  })
}

export function useWorkItemSummary(
  filter: WorkItemFilter = {},
  options: WorkItemQueryOptions = {}
) {
  return useQuery({
    queryKey: workbenchKeys.workItemSummary(filter),
    queryFn: () => workbenchApi.listWorkItemSummary(filter),
    refetchOnMount: "always",
    staleTime: 0,
    ...options,
  })
}

export function useClaimWorkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ClaimWorkItemRequest) => workbenchApi.claimWorkItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbenchKeys.workItemsRoot() })
    },
  })
}

export function useWorkbenchCases(direction: WorkbenchDirection) {
  return useQuery({
    queryKey: workbenchKeys.direction(direction),
    queryFn: () => workbenchApi.listCasesByDirection(direction),
  })
}

export function useWorkflowCaseSearch(params: WorkflowCaseSearchParams) {
  return useQuery({
    queryKey: workbenchKeys.search(params),
    queryFn: () => workbenchApi.searchCases(params),
  })
}

export function useWorkflowTasks(input: WorkflowTaskRequest) {
  return useQuery({
    queryKey: workbenchKeys.tasks(input),
    queryFn: () => workbenchApi.activateTasks(input),
    enabled: false,
  })
}

export function useClaimWorkflowTask(direction: WorkbenchDirection) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workbenchApi.claimTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbenchKeys.all })
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.direction(direction),
      })
      notify.success("Đã nhận task BPMN")
    },
    onError: (error) =>
      notify.error(
        "Nhận task thất bại",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useCompleteWorkflowTask(direction: WorkbenchDirection) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workbenchApi.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbenchKeys.all })
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.direction(direction),
      })
      notify.success("Đã hoàn tất task BPMN")
    },
    onError: (error) =>
      notify.error(
        "Xử lý task that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}
