import { useMemo } from "react"
import type { FieldPath, UseFormReturn } from "react-hook-form"
import { usePlatformOrganizations } from "./geo-queries"
import { SearchSelectField } from "./search-select-field"

type OrgUnitFormValues = {
  orgUnit: string
}

export function OrgUnitField<T extends OrgUnitFormValues>({
  form,
  disabled,
}: {
  form: UseFormReturn<T>
  disabled?: boolean
}) {
  const orgUnitPath = "orgUnit" as FieldPath<T>
  const orgsQuery = usePlatformOrganizations()
  const options = useMemo(
    () =>
      (orgsQuery.data ?? []).map((org) => ({
        value: org.code,
        label: `${org.code} — ${org.name}`,
      })),
    [orgsQuery.data]
  )

  return (
    <SearchSelectField
      control={form.control}
      name={orgUnitPath}
      label="Đơn vị"
      placeholder="Chọn đơn vị"
      options={options}
      loading={orgsQuery.isLoading}
      disabled={disabled}
      error={form.formState.errors.orgUnit?.message as string | undefined}
    />
  )
}
