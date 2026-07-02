import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { GeoAdminUnit } from "../api"

export const wardKeys = {
  all: ["platform", "wards"] as const,
  list: (parentCode: string) => [...wardKeys.all, "list", parentCode] as const,
  provinces: () => ["platform", "wards", "provinces"] as const,
}

export function useWardProvinces() {
  return useQuery({
    queryKey: wardKeys.provinces(),
    queryFn: () => platformApi.listGeoAdminUnits(undefined, 1),
  })
}

export function useWards(parentCode: string) {
  return useQuery({
    queryKey: wardKeys.list(parentCode),
    queryFn: () =>
      parentCode === "all"
        ? platformApi.listGeoAdminUnits(undefined, 2)
        : platformApi.listGeoAdminUnits(parentCode, 2),
  })
}

export function useUpsertWard(isEditing: boolean) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<GeoAdminUnit>) => platformApi.upsertGeoAdminUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wardKeys.all })
      notify.success(isEditing ? "Cap nhat phuong xa thanh cong" : "Them phuong xa thanh cong")
    },
    onError: (error) => {
      notify.error("Luu phuong xa that bai", translateApiError(error))
    },
  })
}
