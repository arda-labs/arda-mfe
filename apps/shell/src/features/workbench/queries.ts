import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@workspace/notifications/notify"
import {
  workbenchApi,
  type WorkbenchDirection,
  type WorkflowCaseSearchParams,
  type WorkflowTaskRequest,
} from "./api"

export const workbenchKeys = {
  all: ["workflow", "workbench"] as const,
  direction: (direction: WorkbenchDirection) =>
    [...workbenchKeys.all, "direction", direction] as const,
  search: (params: WorkflowCaseSearchParams) =>
    [...workbenchKeys.all, "search", params] as const,
  tasks: (input: WorkflowTaskRequest) =>
    [...workbenchKeys.all, "tasks", input.taskType, input.role] as const,
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
