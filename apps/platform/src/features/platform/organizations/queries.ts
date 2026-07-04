import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi, type OrganizationsListParams } from "../api"
import type { Organization } from "../api"

export const organizationKeys = {
  all: ["platform", "organizations"] as const,
  list: (params: OrganizationsListParams) =>
    [...organizationKeys.all, "list", params] as const,
  options: () => [...organizationKeys.all, "options"] as const,
  tree: () => [...organizationKeys.all, "tree"] as const,
}

export function useOrganizations(params: OrganizationsListParams) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => platformApi.listOrganizations(params),
  })
}

export function useOrganizationOptions() {
  return useQuery({
    queryKey: organizationKeys.options(),
    queryFn: () => platformApi.listOrganizations({ view: "options" }),
  })
}

export function useOrganizationTree() {
  return useQuery({
    queryKey: organizationKeys.tree(),
    queryFn: () => platformApi.listOrganizations({ view: "tree" }),
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: Partial<Organization>) => platformApi.createOrganization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success(t("platform.organizations.toast.create_success"))
    },
    onError: (error) => {
      notify.error(t("platform.organizations.toast.save_failed"), translateApiError(error))
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Organization> }) =>
      platformApi.updateOrganization(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success(t("platform.organizations.toast.update_success"))
    },
    onError: (error) => {
      notify.error(t("platform.organizations.toast.save_failed"), translateApiError(error))
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      notify.success(t("platform.organizations.toast.delete_success"))
    },
    onError: (error) => {
      notify.error(t("platform.organizations.toast.delete_failed"), translateApiError(error))
    },
  })
}
