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
      notify.success("Đã lưu hồ sơ khách hàng")
    },
    onError: (error) =>
      notify.error(
        "Lưu hồ sơ khách hàng thất bại",
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
      notify.success("Đã trình duyệt hồ sơ khách hàng")
    },
    onError: (error) =>
      notify.error(
        "Trình duyệt hồ sơ thất bại",
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
      notify.success("Đã thêm quan hệ khách hàng")
    },
    onError: (error) =>
      notify.error(
        "Thêm quan hệ thất bại",
        error instanceof Error ? error.message : undefined
      ),
  })
}

export function useUploadCustomerAvatar() {
  return useMutation({
    mutationFn: ({ file, customerId }: { file: File; customerId: string }) =>
      uploadFile(file, "crm", "customer_avatar", customerId),
    onSuccess: () => notify.success("Đã tải ảnh đại diện lên media-service"),
    onError: (error) =>
      notify.error(
        "Tải ảnh đại diện thất bại",
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
      notify.success("Đã hoàn tất task quy trình")
    },
    onError: (error) =>
      notify.error(
        "Hoàn tất task thất bại",
        error instanceof Error ? error.message : undefined
      ),
  })
}
