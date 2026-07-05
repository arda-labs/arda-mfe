import { api } from "@workspace/api"
import {
  buildListSearchParams,
  type ListResponse,
} from "@workspace/core/http/list-api"

export interface AuditEvent {
  id: string
  eventType: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, any>
  clientIp: string
  userAgent: string
  requestId: string
  serviceName: string
  timestamp: string
}

type AuditEventApiItem = Partial<AuditEvent> & {
  ID?: string
  EventType?: string
  Subject?: string
  Action?: string
  Resource?: string
  Result?: string
  Details?: Record<string, any>
  ClientIP?: string
  UserAgent?: string
  RequestID?: string
  ServiceName?: string
  Timestamp?: string
}

export interface AuditStats {
  totalEvents: number
  byEventType: Record<string, number>
  byResult: Record<string, number>
  loginSuccess: number
  loginFailure: number
  from: string
  to: string
}

export interface ChainVerification {
  valid: boolean
  total: number
  tampered?: string[]
}

const normalizeAuditEvent = (event: AuditEventApiItem): AuditEvent => ({
  id: event.id ?? event.ID ?? "",
  eventType: event.eventType ?? event.EventType ?? "",
  subject: event.subject ?? event.Subject ?? "",
  action: event.action ?? event.Action ?? "",
  resource: event.resource ?? event.Resource ?? "",
  result: event.result ?? event.Result ?? "",
  details: event.details ?? event.Details ?? {},
  clientIp: event.clientIp ?? event.ClientIP ?? "",
  userAgent: event.userAgent ?? event.UserAgent ?? "",
  requestId: event.requestId ?? event.RequestID ?? "",
  serviceName: event.serviceName ?? event.ServiceName ?? "",
  timestamp: event.timestamp ?? event.Timestamp ?? "",
})

export const auditApi = {
  query: (params?: {
    event_type?: string[]
    subject?: string
    result?: string
    from?: string
    to?: string
    page?: number
    size?: number
    perPage?: number
    sort?: string
  }) => {
    const p = buildListSearchParams({
      page: params?.page,
      perPage: params?.perPage ?? params?.size,
      sort: params?.sort,
    })
    if (params?.event_type) params.event_type.forEach((et) => p.append("event_type", et))
    if (params?.subject) p.set("subject", params.subject)
    if (params?.result) p.set("result", params.result)
    if (params?.from) p.set("from", params.from)
    if (params?.to) p.set("to", params.to)
    return api
      .get<ListResponse<AuditEventApiItem>>(`/api/admin/audit?${p.toString()}`)
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeAuditEvent),
      }))
  },

  stats: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return api.get<AuditStats>(`/api/admin/audit/stats?${p.toString()}`)
  },

  verify: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return api.get<ChainVerification>(`/api/admin/audit/verify?${p.toString()}`)
  },
}
