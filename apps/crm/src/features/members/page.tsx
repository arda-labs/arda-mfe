import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { matchSelectFilter, matchTextColumnFilter } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import {
  listCrmMemberRequests,
  listCrmMembers,
  submitCrmMemberRequest,
  type CrmMember,
  type CrmMemberRequest,
} from "../api"
import { CapitalMovementDialog } from "./components/CapitalMovementDialog"
import { useMemberColumns, type MemberColumnOption } from "./components/member-columns"
import { memberStatusLabel, memberTypeLabel, requestStatusLabel, requestTypeLabel } from "./components/member-labels"

const DEFAULT_PAGE_SIZE = 10

/**
 * QTDND member register (`/customers/members`): the customer's ownership stake
 * plus the capital-movement request pipeline. `listCrmMembers()` returns the
 * complete set for the tenant, so this is a client tier list behind the shared
 * DataTable + ListPageShell.
 */
export function MembersPage() {
  const { t } = useI18n()
  const [members, setMembers] = useState<CrmMember[]>([])
  const [requests, setRequests] = useState<CrmMemberRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [capitalMember, setCapitalMember] = useState<CrmMember | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [memberList, requestList] = await Promise.all([
        listCrmMembers(),
        listCrmMemberRequests(),
      ])
      setMembers(memberList.items)
      setRequests(requestList.items)
      setLoadError(null)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Filter options follow the payload so a new code appears without a frontend
  // change; the labels are translated for the known values.
  const typeOptions = useMemo<MemberColumnOption[]>(() => {
    const counts = new Map<string, number>()
    for (const m of members) counts.set(m.member_type_code, (counts.get(m.member_type_code) ?? 0) + 1)
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: memberTypeLabel(t, value), count }))
  }, [members, t])

  const statusOptions = useMemo<MemberColumnOption[]>(() => {
    const counts = new Map<string, number>()
    for (const m of members) counts.set(m.member_status, (counts.get(m.member_status) ?? 0) + 1)
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: memberStatusLabel(t, value), count }))
  }, [members, t])

  const columns = useMemberColumns({
    typeOptions,
    statusOptions,
    onCapital: setCapitalMember,
  })
  const { table, total } = useClientListTable<CrmMember>({
    columns,
    items: members,
    filterBy: {
      member_code: (item, value) => matchTextColumnFilter(value, item.member_code),
      customer_code: (item, value) => matchTextColumnFilter(value, item.customer_code),
      member_type_code: (item, value) => matchSelectFilter(item.member_type_code, value),
      member_status: (item, value) => matchSelectFilter(item.member_status, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        member_code: (a, b) => a.member_code.localeCompare(b.member_code),
        customer_code: (a, b) => a.customer_code.localeCompare(b.customer_code),
        member_type_code: (a, b) => a.member_type_code.localeCompare(b.member_type_code),
        open_date: (a, b) => a.open_date.localeCompare(b.open_date),
        total_capital_minor: (a, b) => a.total_capital_minor - b.total_capital_minor,
        member_status: (a, b) => a.member_status.localeCompare(b.member_status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const submitCapital = async (input: {
    member_id: string
    request_type: "REGISTER" | "ADDITIONAL" | "WITHDRAW"
    amount_minor: number
    effective_date?: string
    reason?: string
  }) => {
    try {
      await submitCrmMemberRequest(input)
      notify.success(t("members.capital.submitted"))
      await load()
    } catch {
      notify.error(t("members.capital.submit_failed"))
    }
  }

  const recentRequests = requests.slice(0, 5)

  return (
    <>
      <ListPageShell
        title={t("members.title")}
        header={
          <p className="max-w-3xl text-sm text-muted-foreground">{t("members.description")}</p>
        }
        totalRows={total}
        meta={
          <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
            {t("members.count", { count: total })}
          </Badge>
        }
        criticalPending={loading && members.length === 0}
        criticalError={loadError}
        onRetry={() => void load()}
        loadErrorTitle={t("members.load_failed")}
        fetching={loading && members.length > 0}
        table={table}
        onRowDoubleClick={(row) => setCapitalMember(row.original)}
        toolbar={
          <ListTableToolbar
            table={table}
            exportFilename={t("members.title")}
            sheetName={t("members.title")}
            totalRowsCount={total}
          />
        }
        dialogs={
          <CapitalMovementDialog
            member={capitalMember}
            open={capitalMember !== null}
            onOpenChange={(open) => {
              if (!open) setCapitalMember(null)
            }}
            onSubmit={submitCapital}
          />
        }
      />

      {recentRequests.length > 0 ? (
        <div className="space-y-1.5 px-4 pb-2 sm:px-5">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("members.request.title")}
          </p>
          <ul className="space-y-1 text-xs">
            {recentRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>
                  {requestTypeLabel(t, r.request_type)} · {requestStatusLabel(t, r.status)}
                </span>
                <span className="font-mono tabular-nums">
                  {new Intl.NumberFormat("vi-VN").format(r.amount_minor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
