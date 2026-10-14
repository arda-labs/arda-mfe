import { Controller, type UseFormReturn } from "react-hook-form"
import { useI18n } from "@workspace/i18n"
import type { ComboboxOption } from "@workspace/ui/components/combobox"
import { DetailSection } from "@workspace/ui/components/detail-section"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import type { CreateUserValues, EditUserValues } from "../schema"
import { SegmentedControl } from "@workspace/ui/components/segmented-control"
import { SelectField } from "@workspace/ui/components/select-field"

type AllValues = CreateUserValues & EditUserValues

type TenantPickerProps = {
  /** Tenants the actor may assign; see useTenantOptions. */
  tenantOptions: ComboboxOption[]
  tenantOptionsLoading?: boolean
}

export type UserFormSectionsProps = TenantPickerProps &
  (
    | { mode: "create"; form: UseFormReturn<CreateUserValues> }
    | { mode: "edit"; form: UseFormReturn<EditUserValues> }
  )

/**
 * Form fields for the user create and edit pages, grouped in the same sections
 * as the read-only detail view so view/edit/create stay visually aligned.
 */
export function UserFormSections({
  mode,
  form,
  tenantOptions,
  tenantOptionsLoading,
}: UserFormSectionsProps) {
  const { t } = useI18n()
  // Both modes only register fields that exist in their own schema.
  const { register, control, formState, watch } =
    form as unknown as UseFormReturn<AllValues>
  const errors = formState.errors
  // Keep an existing assignment visible even when it is outside the picker
  // (e.g. the superadmin's reserved "system" scope on the edit page).
  const currentTenant = watch("tenantId")
  const tenantChoices =
    currentTenant && !tenantOptions.some((o) => o.value === currentTenant)
      ? [...tenantOptions, { value: currentTenant, label: currentTenant }]
      : tenantOptions

  return (
    <>
      <DetailSection
        id="account"
        title={t("admin.users.detail.section.account")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label={t("admin.users.field.username")}
            required
            error={errors.username?.message}
          >
            <Input
              aria-invalid={Boolean(errors.username)}
              autoComplete="off"
              {...register("username")}
            />
          </FormField>
          <FormField
            label={t("common.field.email")}
            required
            error={errors.email?.message}
          >
            <Input
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.tenant")}
            required
            error={errors.tenantId?.message}
          >
            <Controller
              control={control}
              name="tenantId"
              render={({ field }) => (
                <SelectField
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  options={tenantChoices}
                  placeholder={
                    tenantOptionsLoading
                      ? t("common.loading")
                      : t("admin.users.field.tenant_placeholder")
                  }
                  disabled={tenantOptionsLoading}
                  aria-invalid={Boolean(errors.tenantId)}
                />
              )}
            />
          </FormField>
          {mode === "create" ? (
            <FormField
              label={t("auth.login.field.password")}
              required
              description={t("admin.users.field.password_hint")}
              error={errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </FormField>
          ) : (
            <FormField
              label={t("common.field.status")}
              error={errors.status?.message}
            >
              <SegmentedControl
                aria-invalid={Boolean(errors.status)}
                options={[
                  { value: "ACTIVE", label: t("admin.users.status.active") },
                  {
                    value: "DISABLED",
                    label: t("admin.users.status.disabled"),
                  },
                ]}
                {...register("status")}
              />
            </FormField>
          )}
        </div>
      </DetailSection>

      <DetailSection
        id="profile"
        title={t("admin.users.detail.section.profile")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label={t("admin.users.field.first_name")}
            error={errors.firstName?.message}
          >
            <Input
              aria-invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.last_name")}
            error={errors.lastName?.message}
          >
            <Input
              aria-invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.nickname")}
            error={errors.nickname?.message}
          >
            <Input
              aria-invalid={Boolean(errors.nickname)}
              {...register("nickname")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.position")}
            error={errors.position?.message}
          >
            <Input
              aria-invalid={Boolean(errors.position)}
              {...register("position")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.gender")}
            error={errors.gender?.message}
          >
            <Input
              aria-invalid={Boolean(errors.gender)}
              {...register("gender")}
            />
          </FormField>
          <FormField
            label={t("admin.users.field.country")}
            error={errors.country?.message}
          >
            <Input
              aria-invalid={Boolean(errors.country)}
              {...register("country")}
            />
          </FormField>
          <FormField
            className="lg:col-span-2"
            label={t("admin.users.field.address")}
            error={errors.address?.message}
          >
            <Input
              aria-invalid={Boolean(errors.address)}
              {...register("address")}
            />
          </FormField>
        </div>
      </DetailSection>
    </>
  )
}
