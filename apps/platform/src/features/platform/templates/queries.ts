import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { FileTemplate } from "../api"

export const templateKeys = {
  all: ["platform", "templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
}

export function useFileTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () => platformApi.listFileTemplates(),
  })
}

export function useCreateFileTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<FileTemplate>) => platformApi.createFileTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      notify.success("Them mau bieu thanh cong")
    },
    onError: (error) => {
      notify.error("Luu mau bieu that bai", translateApiError(error))
    },
  })
}

export function useUpdateFileTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FileTemplate> }) =>
      platformApi.updateFileTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      notify.success("Cap nhat mau bieu thanh cong")
    },
    onError: (error) => {
      notify.error("Luu mau bieu that bai", translateApiError(error))
    },
  })
}

export function useDeleteFileTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteFileTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      notify.success("Xoa mau bieu thanh cong")
    },
    onError: (error) => {
      notify.error("Xoa mau bieu that bai", translateApiError(error))
    },
  })
}
