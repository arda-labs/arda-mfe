import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { downloadFile } from "@workspace/api"
import { useAppQueryClient } from "@workspace/query/provider"
import { translateApiError, useI18n } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { usersApi } from "./api"
import { usersListDefinition } from "./list-query"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { SearchCheck } from "lucide-react"
import { useUserColumns } from "./components/user-columns"
import { UsersBatchActions } from "./components/UsersBatchActions"
import { IdentityAuditDialog } from "./components/IdentityAuditDialog"
import { useUserActions } from "./components/use-user-actions"
import type { IdentityConsistencyIssue, User } from "./types"

const USERS_QUERY_KEY = ["iam", "users", "list"]
const USERS_BASE_PATH = "/admin/users"

function userDetailPath(user: User, edit = false) {
  const params = new URLSearchParams({ tenant: user.tenantId })
  if (edit) params.set("mode", "edit")
  return `${USERS_BASE_PATH}/${encodeURIComponent(user.id)}?${params.toString()}`
}

export function UsersPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const queryClient = useAppQueryClient()
  const [identityIssues, setIdentityIssues] = useState<
    IdentityConsistencyIssue[] | null
  >(null)
  const [identityAuditOpen, setIdentityAuditOpen] = useState(false)

  /** Mutations refresh the list through the shared TanStack Query cache. */
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
  }, [queryClient])

  const openDetail = useCallback(
    (user: User) => navigate(userDetailPath(user)),
    [navigate]
  )
  const openEdit = useCallback(
    (user: User) => navigate(userDetailPath(user, true)),
    [navigate]
  )

  const { handlers: rowHandlers, dialogs } = useUserActions({
    onView: openDetail,
    onEdit: openEdit,
    onChanged: invalidateList,
  })

  const handleAuditIdentity = async () => {
    try {
      const res = await usersApi.auditIdentityConsistency()
      setIdentityIssues(res.issues ?? [])
      setIdentityAuditOpen(true)
      if (res.ok) {
        notify.success(t("admin.users.identity.audit_clean"))
      } else {
        notify.info(t("admin.users.identity.audit_issues_found"))
      }
    } catch (err) {
      notify.error(t("admin.users.identity.audit_failed"), translateApiError(err))
    }
  }

  const columns = useUserColumns(rowHandlers)

  /**
   * Server-driven list controller: URL page/perPage + `username`→q + `status`
   * filters <-> TanStack Query cache, cancellation, dedupe and previous-page
   * placeholder handled by @workspace/list-page. The page owns columns,
   * dialogs and row actions only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<User>({
    ...usersListDefinition,
    columns,
    queryFn: async (listQuery) =>
      usersApi.listUsers({
        page: listQuery.page,
        perPage: listQuery.perPage,
        q: listQuery.q === undefined ? undefined : String(listQuery.q),
        status:
          listQuery.status === undefined ? undefined : String(listQuery.status),
        sort: listQuery.sort,
        order: listQuery.order,
        tenantId: actorTenantId,
      }),
  })

  return (
    <ListPageShell
      title={t("admin.users.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.users.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("admin.users.load_failed")}
      fetching={isFetching}
      table={table}
      onRowDoubleClick={(row) => openDetail(row.original)}
      batchActions={(batchTable) => <UsersBatchActions table={batchTable} />}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => navigate(`${USERS_BASE_PATH}/new`)}
          createLabel={t("admin.users.create")}
          exportFilename={t("admin.users.title")}
          sheetName={t("admin.users.title")}
          reportTitle={t("iam.users.export.report_title")}
          totalRowsCount={total}
          onServerExport={async ({ format, filename }) => {
            const exportUrl = usersApi.getExportUrl({
              search: query.q === undefined ? undefined : String(query.q),
              status:
                query.status === undefined ? undefined : String(query.status),
              sort: query.sort,
              order: query.order,
              format,
              tenantId: actorTenantId,
            })
            await downloadFile(exportUrl, {
              filename: filename
                ? filename.endsWith(`.${format}`)
                  ? filename
                  : `${filename}.${format}`
                : undefined,
              fallbackFilename: `users_export.${format}`,
            })
          }}
        >
          <Button
            variant="outline"
            onClick={() => void handleAuditIdentity()}
            className="h-8 px-3 text-xs font-semibold"
          >
            <SearchCheck className="mr-2 size-3.5" />
            {t("admin.users.action.audit_identity")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={
        <>
          {dialogs}
          <IdentityAuditDialog
            open={identityAuditOpen}
            onOpenChange={setIdentityAuditOpen}
            identityIssues={identityIssues}
          />
        </>
      }
    />
  )
}
