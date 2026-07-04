import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { Area } from "../api"

export type AreaListParams = {
  status?: string
  areaTypeCode?: string
  q?: string
}

export const areaKeys = {
  all: ["platform", "areas"] as const,
  list: (params: AreaListParams) => [...areaKeys.all, "list", params] as const,
  dependencies: () => [...areaKeys.all, "dependencies"] as const,
}

export function useAreaDependencies() {
  return useListQuery({
    queryKey: areaKeys.dependencies(),
    queryFn: async () => {
      const [areaTypes, provinces, wards] = await Promise.all([
        platformApi.listLookupValues("AREA_TYPE").catch(() => []),
        platformApi.listGeoAdminUnits(undefined, 1).catch(() => []),
        platformApi.listGeoAdminUnits(undefined, 2).catch(() => []),
      ])

      return {
        areaTypes,
        adminUnits: [...provinces, ...wards],
      }
    },
  })
}

export function useAreas(params: AreaListParams) {
  return useListQuery({
    queryKey: areaKeys.list(params),
    queryFn: () => platformApi.listAreas(params),
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Area>) => platformApi.createArea(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all })
      notify.success("Them khu vuc thanh cong")
    },
    onError: (error) => {
      notify.error("Luu khu vuc that bai", translateApiError(error))
    },
  })
}

export function useUpdateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Area> }) => platformApi.updateArea(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all })
      notify.success("Cap nhat khu vuc thanh cong")
    },
    onError: (error) => {
      notify.error("Luu khu vuc that bai", translateApiError(error))
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all })
      notify.success("Ngung hieu luc khu vuc thanh cong")
    },
    onError: (error) => {
      notify.error("Cap nhat trang thai khu vuc that bai", translateApiError(error))
    },
  })
}
