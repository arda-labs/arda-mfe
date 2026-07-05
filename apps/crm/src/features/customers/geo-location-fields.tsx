import { useEffect, useMemo, useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import {
  useGeoProvinces,
  useGeoWards,
  usePlatformAreas,
} from "./geo-queries"
import { SearchSelectField, toGeoOptions } from "./search-select-field"

type GeoFormValues = {
  provinceCode: string
  wardCode: string
  areaCode: string
}

export function GeoLocationFields<T extends GeoFormValues>({
  form,
}: {
  form: UseFormReturn<T>
}) {
  const provinceCode = form.watch("provinceCode" as keyof T & string) as string
  const wardCode = form.watch("wardCode" as keyof T & string) as string

  const provincesQuery = useGeoProvinces()
  const wardsQuery = useGeoWards(provinceCode)
  const areasQuery = usePlatformAreas(wardCode)

  const provinceOptions = useMemo(
    () => toGeoOptions(provincesQuery.data ?? []),
    [provincesQuery.data]
  )
  const wardOptions = useMemo(
    () => toGeoOptions(wardsQuery.data ?? []),
    [wardsQuery.data]
  )
  const areaOptions = useMemo(
    () =>
      (areasQuery.data ?? []).map((item) => ({
        value: item.code,
        label: `${item.code} — ${item.name}`,
      })),
    [areasQuery.data]
  )

  const prevProvinceRef = useRef(provinceCode)
  const prevWardRef = useRef(wardCode)

  useEffect(() => {
    if (prevProvinceRef.current === provinceCode) return
    prevProvinceRef.current = provinceCode
    form.setValue("wardCode" as keyof T & string, "" as T[keyof T & string])
    form.setValue("areaCode" as keyof T & string, "" as T[keyof T & string])
  }, [form, provinceCode])

  useEffect(() => {
    if (prevWardRef.current === wardCode) return
    prevWardRef.current = wardCode
    form.setValue("areaCode" as keyof T & string, "" as T[keyof T & string])
  }, [form, wardCode])

  return (
    <>
      <SearchSelectField
        control={form.control}
        name={"provinceCode" as keyof T & string}
        label="Tỉnh/Thành phố"
        placeholder="Chọn tỉnh, thành phố"
        options={provinceOptions}
        loading={provincesQuery.isLoading}
        error={form.formState.errors.provinceCode?.message as string | undefined}
      />
      <SearchSelectField
        control={form.control}
        name={"wardCode" as keyof T & string}
        label="Phường/Xã"
        placeholder={
          provinceCode ? "Chọn phường, xã" : "Chọn tỉnh/thành phố trước"
        }
        options={wardOptions}
        disabled={!provinceCode}
        loading={Boolean(provinceCode) && wardsQuery.isLoading}
        error={form.formState.errors.wardCode?.message as string | undefined}
      />
      <SearchSelectField
        control={form.control}
        name={"areaCode" as keyof T & string}
        label="Khu vực"
        placeholder={wardCode ? "Chọn khu vực" : "Chọn phường/xã trước"}
        options={areaOptions}
        disabled={!wardCode}
        loading={Boolean(wardCode) && areasQuery.isLoading}
        error={form.formState.errors.areaCode?.message as string | undefined}
      />
    </>
  )
}
