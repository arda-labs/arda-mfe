import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@workspace/notifications/notify"
import { customerDraftApi } from "./customer-client"
import { fetchPlatformDrafts } from "./sources"
import type { PlatformDraftDomain } from "./types"

export const platformDraftKeys = {
  all: ["workbench", "platform-drafts"] as const,
}

export function usePlatformDrafts() {
  return useQuery({
    queryKey: platformDraftKeys.all,
    queryFn: fetchPlatformDrafts,
  })
}

export function useCancelPlatformDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      domain,
      id,
    }: {
      domain: PlatformDraftDomain
      id: string
    }) => {
      if (domain !== "crm_customer_registration") {
        throw new Error("Chưa hỗ trợ hủy nháp cho nghiệp vụ này")
      }
      return customerDraftApi.cancel(id)
    },
    onSuccess: () => {
      notify.success("Đã hủy hồ sơ nháp")
      void queryClient.invalidateQueries({ queryKey: platformDraftKeys.all })
      void queryClient.invalidateQueries({ queryKey: ["crm", "customers"] })
    },
    onError: (error: unknown) => {
      notify.error(
        "Hủy hồ sơ thất bại",
        error instanceof Error ? error.message : undefined
      )
    },
  })
}
