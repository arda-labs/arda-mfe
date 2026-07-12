import { useEffect, useMemo, useRef, useState } from "react"
import type { FieldPath, PathValue, UseFormReturn } from "react-hook-form"
import {
  platformReferenceApi,
  type GeoAdminUnit,
  type PlatformArea,
} from "./platform-api"
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

  // ── Provinces ──
  const [provinces, setProvinces] = useState<GeoAdminUnit[]>([])
  const [provincesLoading, setProvincesLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    platformReferenceApi
      .listGeoAdminUnits({ level: 1 })
      .then((data) => {
        if (!cancelled) setProvinces(data)
      })
      .finally(() => {
        if (!cancelled) setProvincesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Wards ──
  const [wards, setWards] = useState<GeoAdminUnit[]>([])
  const [wardsLoading, setWardsLoading] = useState(false)
  useEffect(() => {
    if (!provinceCode) {
      setWards([])
      return
    }
    let cancelled = false
    setWardsLoading(true)
    platformReferenceApi
      .listGeoAdminUnits({ parentCode: provinceCode, level: 2 })
      .then((data) => {
        if (!cancelled) setWards(data)
      })
      .finally(() => {
        if (!cancelled) setWardsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [provinceCode])

  // ── Areas ──
  const [areas, setAreas] = useState<PlatformArea[]>([])
  const [areasLoading, setAreasLoading] = useState(false)
  useEffect(() => {
    if (!wardCode) {
      setAreas([])
      return
    }
    let cancelled = false
    setAreasLoading(true)
    platformReferenceApi
      .listAreas({ status: "active" })
      .then((all) => {
        if (!cancelled) setAreas(all.filter((a) => a.admin_unit_code === wardCode))
      })
      .finally(() => {
        if (!cancelled) setAreasLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [wardCode])

  const provinceOptions = useMemo(() => toGeoOptions(provinces), [provinces])
  const wardOptions = useMemo(() => toGeoOptions(wards), [wards])
  const areaOptions = useMemo(
    () =>
      areas.map((item) => ({
        value: item.code,
        label: `${item.code} — ${item.name}`,
      })),
    [areas]
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
        loading={provincesLoading}
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
        loading={Boolean(provinceCode) && wardsLoading}
        error={form.formState.errors.wardCode?.message as string | undefined}
      />
      <SearchSelectField
        control={form.control}
        name={areaPath}
        label="Khu vực"
        placeholder={wardCode ? "Chọn khu vực" : "Chọn phường/xã trước"}
        options={areaOptions}
        disabled={!wardCode}
        loading={Boolean(wardCode) && areasLoading}
        error={form.formState.errors.areaCode?.message as string | undefined}
      />
    </>
  )
}
