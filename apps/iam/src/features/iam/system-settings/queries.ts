import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/api"

export type Parameter = {
  id: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  description?: string
  is_secret: boolean
}

export const systemSettingsKeys = {
  all: ["iam", "system-settings"] as const,
  parameters: () => [...systemSettingsKeys.all, "parameters"] as const,
}

export function useSystemParameters() {
  return useQuery({
    queryKey: systemSettingsKeys.parameters(),
    queryFn: () => api.get<Parameter[]>("/api/platform/parameters"),
  })
}

export function useSaveSystemSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (parameter: Omit<Parameter, "id"> & { id?: string }) =>
      api.post<Parameter>("/api/platform/parameters", parameter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemSettingsKeys.all })
    },
  })
}
