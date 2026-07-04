import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { Parameter } from "../api"

export const parameterKeys = {
  all: ["platform", "parameters"] as const,
  list: () => [...parameterKeys.all, "list"] as const,
  dependencies: () => [...parameterKeys.all, "dependencies"] as const,
}

export function useParameters() {
  return useListQuery({
    queryKey: parameterKeys.list(),
    queryFn: () => platformApi.listParameters(),
  })
}

export function useParameterDependencies() {
  return useListQuery({
    queryKey: parameterKeys.dependencies(),
    queryFn: async () => ({
      orgs: (await platformApi.listOrganizations({ view: "options" }).catch(() => ({
        items: [],
      }))).items,
    }),
  })
}

export function useUpsertParameter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Parameter>) => platformApi.upsertParameter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parameterKeys.all })
      notify.success("Luu tham so he thong thanh cong")
    },
    onError: (error) => {
      notify.error("Luu tham so that bai", translateApiError(error))
    },
  })
}

export function useDeleteParameter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteParameter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parameterKeys.all })
      notify.success("Xoa tham so thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa tham so that bai", translateApiError(error))
    },
  })
}
