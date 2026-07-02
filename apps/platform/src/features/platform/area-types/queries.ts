import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { LookupValue } from "../api"

export const AREA_TYPE_CATEGORY_CODE = "AREA_TYPE"

async function ensureAreaTypeCategory() {
  await platformApi.upsertLookupCategory({
    code: AREA_TYPE_CATEGORY_CODE,
    name: "Loai khu vuc",
    scope_type: "global",
    is_system: false,
    description: "Danh muc loai khu vuc",
  })
}

export const areaTypeKeys = {
  all: ["platform", "area-types"] as const,
  list: () => [...areaTypeKeys.all, "list"] as const,
}

export function useAreaTypes() {
  return useQuery({
    queryKey: areaTypeKeys.list(),
    queryFn: async () => {
      await ensureAreaTypeCategory()
      return platformApi.listLookupValues(AREA_TYPE_CATEGORY_CODE)
    },
  })
}

export function useUpsertAreaType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<LookupValue>) => {
      await ensureAreaTypeCategory()
      return platformApi.upsertLookupValue(AREA_TYPE_CATEGORY_CODE, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTypeKeys.all })
      notify.success("Luu loai khu vuc thanh cong")
    },
    onError: (error) => {
      notify.error("Luu loai khu vuc that bai", translateApiError(error))
    },
  })
}

export function useDeleteAreaType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteLookupValue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTypeKeys.all })
      notify.success("Xoa loai khu vuc thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa loai khu vuc that bai", translateApiError(error))
    },
  })
}
