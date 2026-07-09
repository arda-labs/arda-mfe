import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import {
  customerApi,
  type CustomerStatus,
  type CustomerListParams,
  type CustomerPayload,
  type CustomerRelationshipPayload,
  type AmendmentUpsertPayload,
  type WorkflowTaskRole,
} from "./api"

const platformDraftKeys = {
  all: ["workbench", "platform-drafts"] as const,
}

function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined
}

async function runMutation<T>(
  action: () => Promise<T>,
  messages: {
    success: string
    error: string
    description?: string | ((data: T) => string | undefined)
  }
) {
  try {
    const result = await action()
    const description =
      typeof messages.description === "function"
        ? messages.description(result)
        : messages.description
    notify.success(messages.success, description)
    return result
  } catch (error) {
    notify.error(messages.error, mutationErrorMessage(error))
    throw error
  }
}

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
  amendment: (customerId: string) =>
    [...customerKeys.all, "amendment", customerId] as const,
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
    refetchOnMount: "always",
    staleTime: 0,
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

export type SaveCustomerVariables = {
  payload: CustomerPayload
  quiet?: boolean
}

export function useSaveCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ payload, quiet }: SaveCustomerVariables) => {
      const persist = () => customerApi.save(payload)
      const result = quiet
        ? await persist()
        : await runMutation(persist, {
            success: "Đã lưu nháp",
            error: "Lưu hồ sơ khách hàng thất bại",
            description: (customer) =>
              customer.customerCode
                ? `Mã hồ sơ: ${customer.customerCode}. Tiếp theo: chỉnh sửa hồ sơ rồi bấm Hoàn thành.`
                : "Tiếp theo: chỉnh sửa hồ sơ rồi bấm Hoàn thành.",
          })
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      if (result.id) {
        queryClient.setQueryData(customerKeys.detail(result.id), result)
      }
      return result
    },
  })
}

export function useSubmitCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await runMutation(() => customerApi.submit(id), {
        success: "Đã khởi tạo hồ sơ khách hàng",
        error: "Khởi tạo hồ sơ thất bại",
            description: (customer) => {
          const caseHint = customer.workflowCaseId
            ? `Case BPM: ${customer.workflowCaseId}. `
            : ""
          return `${caseHint}Tiếp tục chỉnh sửa hồ sơ rồi bấm Hoàn thành.`
        },
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: ["workflow"] })
      return result
    },
  })
}

export function useCancelCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await runMutation(() => customerApi.cancel(id), {
        success: "Đã hủy hồ sơ nháp",
        error: "Hủy hồ sơ thất bại",
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: platformDraftKeys.all })
      return result
    },
  })
}

export function useCreateCustomerRelationship(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomerRelationshipPayload) => {
      const result = await runMutation(
        () => customerApi.createRelationship(customerId, payload),
        {
          success: "Đã thêm quan hệ khách hàng",
          error: "Thêm quan hệ thất bại",
        }
      )
      queryClient.invalidateQueries({
        queryKey: customerKeys.relationships(customerId),
      })
      return result
    },
  })
}

export function useUploadCustomerAvatar() {
  return useMutation({
    mutationFn: async (input: { file: File; customerId: string }) =>
      runMutation(
        () =>
          uploadFile(input.file, "crm", "customer_avatar", input.customerId),
        {
          success: "Đã tải ảnh đại diện lên media-service",
          error: "Tải ảnh đại diện thất bại",
        }
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
    mutationFn: async (input: {
      jobKey: string
      processInstanceKey: string
      elementId: string
      variables: Record<string, unknown>
    }) => {
      const result = await runMutation(() => customerApi.completeTask(input), {
        success: "Đã hoàn tất task quy trình",
        error: "Hoàn tất task thất bại",
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.tasks(role) })
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: ["workflow"] })
      return result
    },
  })
}

export function useCaseTimeline(caseId: string | null | undefined) {
  return useQuery({
    queryKey: ["workflow", "case-timeline", caseId ?? ""],
    queryFn: () => customerApi.getWorkflowCaseTimeline(caseId ?? ""),
    enabled: Boolean(caseId),
  })
}

export function useCurrentAmendment(customerId: string | null) {
  return useQuery({
    queryKey: customerKeys.amendment(customerId ?? ""),
    queryFn: () => customerApi.getCurrentAmendment(customerId ?? ""),
    enabled: Boolean(customerId),
  })
}

export function useStartAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerId: string) => {
      const result = await runMutation(
        () => customerApi.startAdjustment(customerId),
        {
          success: "Đã mở phiên điều chỉnh hồ sơ",
          error: "Mở điều chỉnh thất bại",
        }
      )
      queryClient.invalidateQueries({
        queryKey: customerKeys.amendment(customerId),
      })
      return result
    },
  })
}

export function useUpdateAmendment(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      amendmentId: string
      payload: AmendmentUpsertPayload
    }) => {
      const result = await runMutation(
        () =>
          customerApi.updateAmendment(
            customerId,
            input.amendmentId,
            input.payload
          ),
        {
          success: "Đã lưu thay đổi điều chỉnh",
          error: "Lưu điều chỉnh thất bại",
        }
      )
      queryClient.invalidateQueries({
        queryKey: customerKeys.amendment(customerId),
      })
      return result
    },
  })
}

export function useSubmitAmendment(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (amendmentId: string) => {
      const result = await runMutation(
        () => customerApi.submitAmendment(customerId, amendmentId),
        {
          success: "Đã hoàn thành điều chỉnh",
          error: "Hoàn thành điều chỉnh thất bại",
        }
      )
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({
        queryKey: customerKeys.amendment(customerId),
      })
      queryClient.invalidateQueries({ queryKey: ["workflow"] })
      return result
    },
  })
}

export function useCancelAmendment(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (amendmentId: string) => {
      const result = await runMutation(
        () => customerApi.cancelAmendment(customerId, amendmentId),
        {
          success: "Đã hủy phiên điều chỉnh nháp",
          error: "Hủy điều chỉnh thất bại",
        }
      )
      queryClient.invalidateQueries({
        queryKey: customerKeys.amendment(customerId),
      })
      return result
    },
  })
}
