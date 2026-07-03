import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import {
  customerApi,
  type CustomerStatus,
  type CustomerListParams,
  type CustomerPayload,
  type CustomerRelationshipPayload,
  type WorkflowTaskRole,
} from "./api"

export const customerKeys = {
  all: ["crm", "customers"] as const,
  list: (params: CustomerListParams) =>
    [...customerKeys.all, "list", params] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
  relationships: (customerId: string) =>
    [...customerKeys.all, "relationships", customerId] as const,
  drafts: () => [...customerKeys.all, "drafts"] as const,
  tasks: (role: WorkflowTaskRole) =>
    [...customerKeys.all, "tasks", role] as const,
}

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.list(params),
  })
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ""),
    queryFn: () => customerApi.get(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useCustomerRelationships(customerId: string) {
  return useQuery({
    queryKey: customerKeys.relationships(customerId),
    queryFn: () => customerApi.listRelationships(customerId),
    enabled: Boolean(customerId),
  })
}

export function useCustomerDrafts() {
  const statuses: CustomerStatus[] = ["DRAFT", "NEEDS_CHANGES"]
  return useQuery({
    queryKey: customerKeys.drafts(),
    queryFn: async () => {
      const groups = await Promise.all(
        statuses.map((status) => customerApi.list({ status }))
      )
      return groups.flat()
    },
  })
}

export function useSaveCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CustomerPayload) => customerApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      notify.success("Da luu ho so khach hang")
    },
    onError: (error) =>
      notify.error(
        "Luu ho so khach hang that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useSubmitCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customerApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      notify.success("Da trinh duyet ho so khach hang")
    },
    onError: (error) =>
      notify.error(
        "Trinh duyet ho so that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useCreateCustomerRelationship(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CustomerRelationshipPayload) =>
      customerApi.createRelationship(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.relationships(customerId),
      })
      notify.success("Da them quan he khach hang")
    },
    onError: (error) =>
      notify.error(
        "Them quan he that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useUploadCustomerAvatar() {
  return useMutation({
    mutationFn: ({ file, customerId }: { file: File; customerId: string }) =>
      uploadFile(file, "crm", "customer_avatar", customerId),
    onSuccess: () => notify.success("Da tai anh dai dien len media-service"),
    onError: (error) =>
      notify.error(
        "Tai anh dai dien that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useWorkflowTasks(role: WorkflowTaskRole) {
  return useQuery({
    queryKey: customerKeys.tasks(role),
    queryFn: () => customerApi.listTasks(role),
    enabled: false,
  })
}

export function useCompleteWorkflowTask(role: WorkflowTaskRole) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobKey,
      variables,
      processInstanceKey,
      elementId,
    }: {
      jobKey: number
      processInstanceKey: number
      elementId: string
      variables: Record<string, unknown>
    }) => customerApi.completeTask({ jobKey, processInstanceKey, elementId, variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.tasks(role) })
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      notify.success("Da hoan tat task quy trinh")
    },
    onError: (error) =>
      notify.error(
        "Hoan tat task that bai",
        error instanceof Error ? error.message : undefined
      ),
  })
}
