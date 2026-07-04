import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { CreditInstitution } from "../api"

export type CreditInstitutionListParams = {
  status?: string
  q?: string
}

export const creditInstitutionKeys = {
  all: ["platform", "credit-institutions"] as const,
  list: (params: CreditInstitutionListParams) => [...creditInstitutionKeys.all, "list", params] as const,
}

export function useCreditInstitutions(params: CreditInstitutionListParams) {
  return useListQuery({
    queryKey: creditInstitutionKeys.list(params),
    queryFn: () => platformApi.listCreditInstitutions(params),
  })
}

export function useCreateCreditInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<CreditInstitution>) => platformApi.createCreditInstitution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditInstitutionKeys.all })
      notify.success("Them to chuc tin dung thanh cong")
    },
    onError: (error) => {
      notify.error("Luu to chuc tin dung that bai", translateApiError(error))
    },
  })
}

export function useUpdateCreditInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreditInstitution> }) =>
      platformApi.updateCreditInstitution(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditInstitutionKeys.all })
      notify.success("Cap nhat to chuc tin dung thanh cong")
    },
    onError: (error) => {
      notify.error("Luu to chuc tin dung that bai", translateApiError(error))
    },
  })
}

export function useDeleteCreditInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteCreditInstitution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditInstitutionKeys.all })
      notify.success("Xoa to chuc tin dung thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa to chuc tin dung that bai", translateApiError(error))
    },
  })
}
