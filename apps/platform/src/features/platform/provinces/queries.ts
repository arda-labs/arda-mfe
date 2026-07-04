import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { GeoAdminUnit } from "../api"

export const provinceKeys = {
  all: ["platform", "provinces"] as const,
  list: () => [...provinceKeys.all, "list"] as const,
}

export function useProvinces() {
  return useListQuery({
    queryKey: provinceKeys.list(),
    queryFn: () => platformApi.listGeoAdminUnits(undefined, 1),
  })
}

export function useUpsertProvince(isEditing: boolean) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<GeoAdminUnit>) => platformApi.upsertGeoAdminUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.all })
      notify.success(isEditing ? "Cap nhat tinh thanh thanh cong" : "Them tinh thanh thanh cong")
    },
    onError: (error) => {
      notify.error("Luu tinh thanh that bai", translateApiError(error))
    },
  })
}
