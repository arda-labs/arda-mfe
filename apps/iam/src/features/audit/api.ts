import { getCanonical } from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { AuditEvent, AuditEventApiItem, AuditStats, ChainVerification } from "./types"

export const normalizeAuditEvent = (event: AuditEventApiItem): AuditEvent => ({
  id: event.id,
  eventType: event.event_type,
  subject: event.subject,
  action: event.action,
  resource: event.resource,
  result: event.result,
  details: event.details,
  clientIp: event.client_ip,
  userAgent: event.user_agent,
  requestId: event.request_id,
  serviceName: event.service_name,
  timestamp: event.timestamp,
})

export const auditApi = {
  query: (params?: {
    event_type?: string[]
    subject?: string
    result?: string
    from?: string
    to?: string
    page?: number
    perPage?: number
    sort?: string
  }) => {
    const p = buildListSearchParams({
      page: params?.page,
      perPage: params?.perPage,
      sort: params?.sort,
    })
    if (params?.event_type)
      params.event_type.forEach((et) => p.append("event_type", et))
    if (params?.subject) p.set("subject", params.subject)
    if (params?.result) p.set("result", params.result)
    if (params?.from) p.set("from", params.from)
    if (params?.to) p.set("to", params.to)
    return getCanonical<ListResponse<AuditEventApiItem>>(
      `/api/admin/audit?${p.toString()}`
    ).then((res) => ({
      ...res,
      items: res.items.map(normalizeAuditEvent),
    }))
  },

  stats: (from?: string, to?: string) => {
    const p = buildSearchParams({ from, to })
    return getCanonical<AuditStats>(`/api/admin/audit/stats?${p.toString()}`)
  },

  verify: (from?: string, to?: string) => {
    const p = buildSearchParams({ from, to })
    return getCanonical<ChainVerification>(`/api/admin/audit/verify?${p.toString()}`)
  },
}
