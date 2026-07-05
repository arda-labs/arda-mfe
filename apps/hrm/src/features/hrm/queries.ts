import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import { hrmApi } from "./api"
import type { JobTitle, OrgUnit, Position } from "./api"

export const hrmKeys = {
  all: ["hrm"] as const,
  positions: () => [...hrmKeys.all, "positions"] as const,
  jobTitles: () => [...hrmKeys.all, "job-titles"] as const,
  orgUnits: () => [...hrmKeys.all, "org-units"] as const,
  employees: () => [...hrmKeys.all, "employees"] as const,
  registrations: () => [...hrmKeys.all, "registrations"] as const,
  organizations: () => ["platform", "organizations"] as const,
}

export function usePositions() {
  return useQuery({
    queryKey: hrmKeys.positions(),
    queryFn: hrmApi.listPositions,
  })
}

export function useCreatePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Position>) => hrmApi.createPosition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.positions() })
      notify.success("Da luu chuc vu")
    },
    onError: (error) => notify.error("Luu chuc vu that bai", translateApiError(error)),
  })
}

export function useUpdatePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Position> }) =>
      hrmApi.updatePosition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.positions() })
      notify.success("Da cap nhat chuc vu")
    },
    onError: (error) => notify.error("Luu chuc vu that bai", translateApiError(error)),
  })
}

export function useDeletePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: hrmApi.deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.positions() })
      notify.success("Da xoa chuc vu")
    },
    onError: (error) => notify.error("Xoa chuc vu that bai", translateApiError(error)),
  })
}

export function useJobTitles() {
  return useQuery({
    queryKey: hrmKeys.jobTitles(),
    queryFn: hrmApi.listJobTitles,
  })
}

export function useCreateJobTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<JobTitle>) => hrmApi.createJobTitle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.jobTitles() })
      notify.success("Da luu chuc danh")
    },
    onError: (error) => notify.error("Luu chuc danh that bai", translateApiError(error)),
  })
}

export function useUpdateJobTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<JobTitle> }) =>
      hrmApi.updateJobTitle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.jobTitles() })
      notify.success("Da cap nhat chuc danh")
    },
    onError: (error) => notify.error("Luu chuc danh that bai", translateApiError(error)),
  })
}

export function useDeleteJobTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: hrmApi.deleteJobTitle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.jobTitles() })
      notify.success("Da xoa chuc danh")
    },
    onError: (error) => notify.error("Xoa chuc danh that bai", translateApiError(error)),
  })
}

export function useOrgUnits() {
  return useQuery({
    queryKey: hrmKeys.orgUnits(),
    queryFn: () => hrmApi.listOrgUnits(),
  })
}

export function useOrganizations() {
  return useQuery({
    queryKey: hrmKeys.organizations(),
    queryFn: hrmApi.listOrganizations,
  })
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<OrgUnit>) => hrmApi.createOrgUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.orgUnits() })
      notify.success("Da luu phong ban")
    },
    onError: (error) => notify.error("Luu phong ban that bai", translateApiError(error)),
  })
}

export function useUpdateOrgUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OrgUnit> }) =>
      hrmApi.updateOrgUnit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.orgUnits() })
      notify.success("Da cap nhat phong ban")
    },
    onError: (error) => notify.error("Luu phong ban that bai", translateApiError(error)),
  })
}

export function useDeleteOrgUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: hrmApi.deleteOrgUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.orgUnits() })
      notify.success("Da xoa phong ban")
    },
    onError: (error) => notify.error("Xoa phong ban that bai", translateApiError(error)),
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: hrmKeys.employees(),
    queryFn: hrmApi.listEmployees,
  })
}

export function useEmployeeRegistrations() {
  return useQuery({
    queryKey: hrmKeys.registrations(),
    queryFn: hrmApi.listEmployeeRegistrations,
  })
}

export function useCreateEmployeeRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: hrmApi.createEmployeeRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.registrations() })
      notify.success("Da tao dang ky nhan su")
    },
    onError: (error) =>
      notify.error("Tao dang ky nhan su that bai", translateApiError(error)),
  })
}

export function useUpdateEmployeeRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      hrmApi.updateEmployeeRegistration(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.registrations() })
      notify.success("Da luu dang ky nhan su")
    },
    onError: (error) =>
      notify.error("Luu dang ky nhan su that bai", translateApiError(error)),
  })
}

export function useSubmitEmployeeRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: hrmApi.submitEmployeeRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmKeys.registrations() })
      notify.success("Da gui dang ky nhan su")
    },
    onError: (error) =>
      notify.error("Gui dang ky nhan su that bai", translateApiError(error)),
  })
}

export function useUploadEmployeeAvatar() {
  return useMutation({
    mutationFn: ({ file, registrationCode }: { file: File; registrationCode: string }) =>
      uploadFile(file, "hrm", "employee_avatar", registrationCode),
    onSuccess: () => notify.success("Đã tải ảnh đại diện lên media-service"),
    onError: (error) =>
      notify.error(
        "Tải ảnh đại diện thất bại",
        error instanceof Error ? error.message : undefined
      ),
  })
}
