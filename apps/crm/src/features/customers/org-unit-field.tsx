import { useEffect, useMemo, useState } from "react"
import type { FieldPath, UseFormReturn } from "react-hook-form"
import { platformReferenceApi, type PlatformOrganization } from "./platform-api"
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
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    platformReferenceApi
      .listOrganizations({ all: true, is_active: true })
      .then((response) => {
        if (!cancelled) setOrgs(response.items)
      })
      .finally(() => {
        if (!cancelled) setOrgsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const options = useMemo(
    () =>
      orgs.map((org) => ({
        value: org.code,
        label: `${org.code} — ${org.name}`,
      })),
    [orgs]
  )

  return (
    <SearchSelectField
      control={form.control}
      name={orgUnitPath}
      label="Đơn vị"
      placeholder="Chọn đơn vị"
      options={options}
      loading={orgsLoading}
      disabled={disabled}
      error={form.formState.errors.orgUnit?.message as string | undefined}
    />
  )
}
