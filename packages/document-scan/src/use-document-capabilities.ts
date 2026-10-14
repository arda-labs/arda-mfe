import { useQuery } from "@tanstack/react-query"
import { fetchCapabilities } from "./api"

/** Hidden-feature friendly: 403 or no model just means "no button", so no retry. */
export function useDocumentCapabilities() {
  return useQuery({
    queryKey: ["document-scan", "capabilities"],
    queryFn: ({ signal }) => fetchCapabilities(signal),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
