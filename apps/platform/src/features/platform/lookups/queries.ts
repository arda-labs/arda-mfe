import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { LookupCategory, LookupValue } from "../api"

export const lookupKeys = {
  all: ["platform", "lookups"] as const,
  categories: () => [...lookupKeys.all, "categories"] as const,
  values: (categoryCode?: string) => [...lookupKeys.all, "values", categoryCode] as const,
}

export function useLookupCategories() {
  return useQuery({
    queryKey: lookupKeys.categories(),
    queryFn: () => platformApi.listLookupCategories(),
  })
}

export function useLookupValues(categoryCode?: string) {
  return useQuery({
    queryKey: lookupKeys.values(categoryCode),
    queryFn: () => platformApi.listLookupValues(categoryCode ?? ""),
    enabled: !!categoryCode,
  })
}

export function useUpsertLookupCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<LookupCategory>) => platformApi.upsertLookupCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.categories() })
      notify.success("Luu danh muc thanh cong")
    },
    onError: (error) => {
      notify.error("Luu danh muc that bai", translateApiError(error))
    },
  })
}

export function useDeleteLookupCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteLookupCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.all })
      notify.success("Xoa danh muc thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa danh muc that bai", translateApiError(error))
    },
  })
}

export function useUpsertLookupValue(categoryCode?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<LookupValue>) => platformApi.upsertLookupValue(categoryCode ?? "", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.values(categoryCode) })
      notify.success("Luu gia tri danh muc thanh cong")
    },
    onError: (error) => {
      notify.error("Luu gia tri that bai", translateApiError(error))
    },
  })
}

export function useDeleteLookupValue(categoryCode?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteLookupValue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lookupKeys.values(categoryCode) })
      notify.success("Xoa gia tri thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa gia tri that bai", translateApiError(error))
    },
  })
}
