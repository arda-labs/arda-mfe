import { useCallback, useState, type ReactNode } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil } from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { useAppQueryClient } from "@workspace/query/provider"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DescriptionList } from "@workspace/ui/components/description-list"
import { DetailFooterBar } from "@workspace/ui/components/detail-footer-bar"
import { DetailPageShell } from "@workspace/ui/components/detail-page-shell"
import { DetailSection } from "@workspace/ui/components/detail-section"
import { DiscardChangesDialog } from "@workspace/ui/components/discard-changes-dialog"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { notify } from "@workspace/ui/feedback/notify"
import { useUnsavedChangesGuard } from "@workspace/ui/hooks/use-unsaved-changes-guard"
import { usersApi } from "./api"
import { USERS_LIST_PATH } from "./create-page"
import { UserFormSections } from "./components/UserFormSections"
import { UserRowActions } from "./components/UserRowActions"
import { useUserActions } from "./components/use-user-actions"
import {
  editUserSchema,
  toEditUserValues,
  type EditUserValues,
} from "./schema"
import type { User } from "./types"

const DETAIL_QUERY_KEY = ["iam", "users", "detail"]
const LIST_QUERY_KEY = ["iam", "users", "list"]

function useUserRoute() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const id = decodeURIComponent(pathname.split("/").filter(Boolean)[2] ?? "")
  return {
    id,
    tenantId: searchParams.get("tenant") ?? actorTenantId,
    editing: searchParams.get("mode") === "edit",
  }
}

function userPath(user: Pick<User, "id" | "tenantId">, edit = false) {
  const params = new URLSearchParams({ tenant: user.tenantId })
  if (edit) params.set("mode", "edit")
  return `${USERS_LIST_PATH}/${encodeURIComponent(user.id)}?${params.toString()}`
}

/** Record page for one user: read-only view, with an explicit edit mode. */
export function UserDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useAppQueryClient()
  const { id, tenantId, editing } = useUserRoute()

  const query = useQuery({
    queryKey: [...DETAIL_QUERY_KEY, id, tenantId],
    queryFn: () => usersApi.getUser(id, tenantId),
    enabled: id !== "" && tenantId !== "",
  })
  const user = query.data

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY })
  }, [queryClient])

  const { handlers, dialogs } = useUserActions({
    onEdit: (target) => navigate(userPath(target, true)),
    onChanged: refresh,
    onDeleted: () => navigate(USERS_LIST_PATH),
  })

  if (query.isPending) {
    return (
      <DetailPageShell title={t("common.loading")} backLabel={t("admin.users.detail.back")} onBack={() => navigate(USERS_LIST_PATH)}>
        <div className="h-48 animate-pulse rounded-lg bg-muted/50" />
      </DetailPageShell>
    )
  }

  if (query.isError || !user) {
    return (
      <DetailPageShell
        title={t("admin.users.detail.not_found")}
        backLabel={t("admin.users.detail.back")}
        onBack={() => navigate(USERS_LIST_PATH)}
        actions={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("common.action.retry")}
          </Button>
        }
      >
        <p role="alert" className="text-sm text-destructive">
          {t("admin.users.detail.load_failed")}
        </p>
      </DetailPageShell>
    )
  }

  return (
    <>
      {editing ? (
        <UserEditView user={user} onSaved={refresh} />
      ) : (
        <UserView
          user={user}
          actions={
            <>
              <Button onClick={() => navigate(userPath(user, true))}>
                <Pencil className="mr-2 size-4" aria-hidden />
                {t("common.action.edit")}
              </Button>
              <UserRowActions user={user} handlers={handlers} />
            </>
          }
          onManageRoles={() => handlers.onManageRoles(user)}
          onManageSessions={() => handlers.onManageSessions(user)}
          onManageScope={() => handlers.onManageScope(user)}
        />
      )}
      {dialogs}
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  const active = status === "ACTIVE"
  return (
    <Status variant={active ? "success" : "default"}>
      <StatusIndicator />
      <StatusLabel>
        {active ? t("admin.users.status.active") : t("admin.users.status.disabled")}
      </StatusLabel>
    </Status>
  )
}

function UserView({
  user,
  actions,
  onManageRoles,
  onManageSessions,
  onManageScope,
}: {
  user: User
  actions: ReactNode
  onManageRoles: () => void
  onManageSessions: () => void
  onManageScope: () => void
}) {
  const { t, formatDate } = useI18n()
  const navigate = useNavigate()
  const displayName =
    user.name || [user.firstName, user.lastName].filter(Boolean).join(" ")

  return (
    <DetailPageShell
      title={user.username || user.email}
      subtitle={[displayName, user.email].filter(Boolean).join(" · ")}
      badges={<StatusBadge status={user.status} />}
      backLabel={t("admin.users.detail.back")}
      onBack={() => navigate(USERS_LIST_PATH)}
      actions={actions}
      sections={[
        { id: "account", label: t("admin.users.detail.section.account") },
        { id: "profile", label: t("admin.users.detail.section.profile") },
        { id: "access", label: t("admin.users.detail.section.access") },
      ]}
      sectionNavLabel={t("admin.users.detail.section.nav")}
    >
      <DetailSection id="account" title={t("admin.users.detail.section.account")}>
        <DescriptionList
          items={[
            { label: t("admin.users.field.username"), value: user.username },
            { label: t("common.field.email"), value: user.email },
            { label: t("common.field.status"), value: <StatusBadge status={user.status} /> },
            { label: t("admin.users.field.tenant"), value: user.tenantId },
            {
              label: t("common.field.created"),
              value: user.createdAt ? formatDate(user.createdAt) : undefined,
            },
          ]}
        />
      </DetailSection>
      <DetailSection id="profile" title={t("admin.users.detail.section.profile")}>
        <DescriptionList
          items={[
            { label: t("admin.users.field.first_name"), value: user.firstName },
            { label: t("admin.users.field.last_name"), value: user.lastName },
            { label: t("admin.users.field.nickname"), value: user.nickname },
            { label: t("admin.users.field.position"), value: user.position },
            { label: t("admin.users.field.gender"), value: user.gender },
            { label: t("admin.users.field.country"), value: user.country },
            { label: t("admin.users.field.address"), value: user.address, wide: true },
          ]}
        />
      </DetailSection>
      <DetailSection
        id="access"
        title={t("admin.users.detail.section.access")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onManageRoles}>
              {t("admin.users.action.roles")}
            </Button>
            <Button variant="outline" size="sm" onClick={onManageScope}>
              {t("admin.users.action.scope")}
            </Button>
            <Button variant="outline" size="sm" onClick={onManageSessions}>
              {t("admin.users.action.sessions")}
            </Button>
          </div>
        }
      >
        <DescriptionList
          columns={2}
          items={[
            {
              label: t("admin.users.field.roles"),
              wide: true,
              value:
                user.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : undefined,
            },
          ]}
        />
      </DetailSection>
    </DetailPageShell>
  )
}

function UserEditView({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [confirmLeave, setConfirmLeave] = useState(false)

  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: toEditUserValues(user),
  })
  const { isDirty, isSubmitting } = form.formState
  useUnsavedChangesGuard(isDirty)

  const viewPath = userPath(user)
  const requestCancel = () => (isDirty ? setConfirmLeave(true) : navigate(viewPath))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await usersApi.updateUser(user.id, user.tenantId, {
        username: values.username.trim(),
        email: values.email.trim(),
        firstName: values.firstName?.trim() || "",
        lastName: values.lastName?.trim() || "",
        nickname: values.nickname?.trim() || "",
        gender: values.gender?.trim() || "",
        country: values.country?.trim() || "",
        address: values.address?.trim() || "",
        position: values.position?.trim() || "",
        status: values.status,
        tenantId: values.tenantId.trim(),
      })
      notify.success(t("admin.users.update_success"))
      onSaved()
      form.reset(values)
      // The tenant may have changed; the view URL carries the tenant used to load.
      navigate(userPath({ id: user.id, tenantId: values.tenantId.trim() }))
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="h-full min-h-0">
      <DetailPageShell
        title={user.username || user.email}
        subtitle={t("admin.users.edit")}
        backLabel={t("admin.users.detail.back")}
        onBack={requestCancel}
        sections={[
          { id: "account", label: t("admin.users.detail.section.account") },
          { id: "profile", label: t("admin.users.detail.section.profile") },
        ]}
        sectionNavLabel={t("admin.users.detail.section.nav")}
        footer={
          <DetailFooterBar dirty={isDirty} dirtyLabel={t("admin.users.detail.unsaved")}>
            <Button type="button" variant="outline" onClick={requestCancel}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {t("admin.users.action.save_changes")}
            </Button>
          </DetailFooterBar>
        }
      >
        <UserFormSections mode="edit" form={form} />
      </DetailPageShell>
      <DiscardChangesDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        onDiscard={() => navigate(viewPath)}
        title={t("admin.users.detail.discard.title")}
        description={t("admin.users.detail.discard.description")}
        keepLabel={t("admin.users.detail.discard.keep")}
        discardLabel={t("admin.users.detail.discard.confirm")}
      />
    </form>
  )
}
