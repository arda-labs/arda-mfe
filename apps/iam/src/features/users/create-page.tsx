import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { useAppQueryClient } from "@workspace/query/provider"
import { Button } from "@workspace/ui/components/button"
import { DetailFooterBar } from "@workspace/ui/components/detail-footer-bar"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DiscardChangesDialog } from "@workspace/ui/components/discard-changes-dialog"
import { notify } from "@workspace/ui/feedback/notify"
import { useUnsavedChangesGuard } from "@workspace/ui/hooks/use-unsaved-changes-guard"
import { usersApi } from "./api"
import { UserFormSections } from "./components/UserFormSections"
import { useTenantOptions } from "./use-tenant-options"
import {
  createUserDefaultValues,
  createUserSchema,
  type CreateUserValues,
} from "./schema"

export const USERS_LIST_PATH = "/admin/users"

/** Standalone "create user" page (`/admin/users/new`). */
export function UserCreatePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useAppQueryClient()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const {
    options: tenantOptions,
    defaultTenantId,
    isLoading: tenantOptionsLoading,
  } = useTenantOptions()

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createUserDefaultValues,
  })

  // Preselect the actor's tenant (or the only choice) once the options load;
  // as a default value so it does not mark the form dirty.
  useEffect(() => {
    if (defaultTenantId && !form.getValues("tenantId")) {
      form.resetField("tenantId", { defaultValue: defaultTenantId })
    }
  }, [defaultTenantId, form])
  const { isDirty, isSubmitting } = form.formState
  useUnsavedChangesGuard(isDirty)

  const goBack = () => navigate(USERS_LIST_PATH)
  const requestBack = () => (isDirty ? setConfirmLeave(true) : goBack())

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await usersApi.createUser(values)
      notify.success(t("admin.users.create_success"))
      void queryClient.invalidateQueries({ queryKey: ["iam", "users", "list"] })
      // Reset first so the unsaved-changes guard is off before navigating.
      form.reset(values)
      goBack()
    } catch (err) {
      notify.error(t("admin.users.create_failed"), translateApiError(err))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="h-full min-h-0">
      <DetailPageShell
        title={t("admin.users.create")}
        backLabel={t("admin.users.detail.back")}
        onBack={requestBack}
        sections={[
          { id: "account", label: t("admin.users.detail.section.account") },
          { id: "profile", label: t("admin.users.detail.section.profile") },
        ]}
        sectionNavLabel={t("admin.users.detail.section.nav")}
        footer={
          <DetailFooterBar
            dirty={isDirty}
            dirtyLabel={t("admin.users.detail.unsaved")}
          >
            <Button type="button" variant="outline" onClick={requestBack}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t("common.action.create")}
            </Button>
          </DetailFooterBar>
        }
      >
        <UserFormSections
          mode="create"
          form={form}
          tenantOptions={tenantOptions}
          tenantOptionsLoading={tenantOptionsLoading}
        />
      </DetailPageShell>
      <DiscardChangesDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        onDiscard={goBack}
        title={t("admin.users.detail.discard.title")}
        description={t("admin.users.detail.discard.description")}
        keepLabel={t("admin.users.detail.discard.keep")}
        discardLabel={t("admin.users.detail.discard.confirm")}
      />
    </form>
  )
}
