import type { UseFormReturn } from "react-hook-form"
import { useI18n } from "@workspace/i18n"
import { DetailSection } from "@workspace/ui/components/detail-section"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import type { CreateUserValues, EditUserValues } from "../schema"

type AllValues = CreateUserValues & EditUserValues

export type UserFormSectionsProps =
  | { mode: "create"; form: UseFormReturn<CreateUserValues> }
  | { mode: "edit"; form: UseFormReturn<EditUserValues> }

const selectClassName =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none dark:bg-input/30"

/**
 * Form fields for the user create and edit pages, grouped in the same sections
 * as the read-only detail view so view/edit/create stay visually aligned.
 */
export function UserFormSections({ mode, form }: UserFormSectionsProps) {
  const { t } = useI18n()
  // Both modes only register fields that exist in their own schema.
  const { register, formState } = form as unknown as UseFormReturn<AllValues>
  const errors = formState.errors

  return (
    <>
      <DetailSection
        id="account"
        title={t("admin.users.detail.section.account")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label={t("admin.users.field.username")}
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
            error={errors.tenantId?.message}
          >
            <Input
              aria-invalid={Boolean(errors.tenantId)}
              {...register("tenantId")}
            />
          </FormField>
          {mode === "create" ? (
            <FormField
              label={t("auth.login.field.password")}
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
              <select className={selectClassName} {...register("status")}>
                <option value="ACTIVE">{t("admin.users.status.active")}</option>
                <option value="DISABLED">
                  {t("admin.users.status.disabled")}
                </option>
              </select>
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
