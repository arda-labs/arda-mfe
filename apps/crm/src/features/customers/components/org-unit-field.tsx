import { useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import type { FieldPath, UseFormReturn } from "react-hook-form"
import { platformReferenceApi, type PlatformOrganization } from "../../api"
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
  const { t } = useI18n()
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
      label={t("crm.customers.org_unit.label")}
      placeholder={t("crm.customers.org_unit.placeholder")}
      options={options}
      loading={orgsLoading}
      disabled={disabled}
      error={form.formState.errors.orgUnit?.message as string | undefined}
    />
  )
}
