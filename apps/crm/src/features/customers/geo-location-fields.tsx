import { useEffect, useMemo, useRef } from "react"
import type { FieldPath, PathValue, UseFormReturn } from "react-hook-form"
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
  const provincePath = "provinceCode" as FieldPath<T>
  const wardPath = "wardCode" as FieldPath<T>
  const areaPath = "areaCode" as FieldPath<T>

  const provinceCode = String(form.watch(provincePath) ?? "")
  const wardCode = String(form.watch(wardPath) ?? "")

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
    form.setValue(wardPath, "" as PathValue<T, typeof wardPath>)
    form.setValue(areaPath, "" as PathValue<T, typeof areaPath>)
  }, [areaPath, form, provinceCode, wardPath])

  useEffect(() => {
    if (prevWardRef.current === wardCode) return
    prevWardRef.current = wardCode
    form.setValue(areaPath, "" as PathValue<T, typeof areaPath>)
  }, [areaPath, form, wardCode])

  return (
    <>
      <SearchSelectField
        control={form.control}
        name={provincePath}
        label="Tỉnh/Thành phố"
        placeholder="Chọn tỉnh, thành phố"
        options={provinceOptions}
        loading={provincesQuery.isLoading}
        error={form.formState.errors.provinceCode?.message as string | undefined}
      />
      <SearchSelectField
        control={form.control}
        name={wardPath}
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
        name={areaPath}
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
