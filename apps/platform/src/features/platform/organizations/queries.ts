import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { Organization } from "../api"

export const organizationKeys = {
  all: ["platform", "organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
}

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => platformApi.listOrganizations(),
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Organization>) => platformApi.createOrganization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success("Them don vi thanh cong")
    },
    onError: (error) => {
      notify.error("Luu don vi that bai", translateApiError(error))
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Organization> }) =>
      platformApi.updateOrganization(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success("Cap nhat don vi thanh cong")
    },
    onError: (error) => {
      notify.error("Luu don vi that bai", translateApiError(error))
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success("Xoa don vi thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa don vi that bai", translateApiError(error))
    },
  })
}
