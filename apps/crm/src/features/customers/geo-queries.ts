import { useQuery } from "@tanstack/react-query"
import { platformReferenceApi } from "./platform-api"

export const geoKeys = {
  all: ["crm", "geo"] as const,
  provinces: () => [...geoKeys.all, "provinces"] as const,
  wards: (provinceCode: string) =>
    [...geoKeys.all, "wards", provinceCode] as const,
  areas: (wardCode: string) => [...geoKeys.all, "areas", wardCode] as const,
  organizations: () => [...geoKeys.all, "organizations"] as const,
}

export function useGeoProvinces() {
  return useQuery({
    queryKey: geoKeys.provinces(),
    queryFn: () => platformReferenceApi.listGeoAdminUnits({ level: 1 }),
    staleTime: 5 * 60_000,
  })
}

export function useGeoWards(provinceCode: string) {
  return useQuery({
    queryKey: geoKeys.wards(provinceCode),
    queryFn: () =>
      platformReferenceApi.listGeoAdminUnits({
        parentCode: provinceCode,
        level: 2,
      }),
    enabled: Boolean(provinceCode),
    staleTime: 5 * 60_000,
  })
}

export function usePlatformAreas(wardCode: string) {
  return useQuery({
    queryKey: geoKeys.areas(wardCode),
    queryFn: async () => {
      const items = await platformReferenceApi.listAreas({ status: "active" })
      return items.filter((item) => item.admin_unit_code === wardCode)
    },
    enabled: Boolean(wardCode),
    staleTime: 60_000,
  })
}

export function usePlatformOrganizations() {
  return useQuery({
    queryKey: geoKeys.organizations(),
    queryFn: async () => {
      const response = await platformReferenceApi.listOrganizations({
        all: true,
        is_active: true,
      })
      return response.items
    },
    staleTime: 5 * 60_000,
  })
}
