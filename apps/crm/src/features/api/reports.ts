import { buildSearchParams } from "@workspace/api/query"
import { getCanonicalList } from "@workspace/api"

/** Customer report rows (W4c). */
export interface CustomerReportRow {
  customer_code: string
  name: string
  customer_type: string
  mobile?: string
  segment?: string
  customer_rank?: string
  risk_level?: string
  status: string
  org_id?: string
  created_at?: string
}

/** Báo cáo khách hàng (q lọc mã/tên/điện thoại). */
export function customerReport(
  params: { q?: string; customer_type?: string; status?: string } = {}
) {
  const q = buildSearchParams({
    q: params.q,
    customer_type: params.customer_type,
    status: params.status,
  })
  const suffix = q.size ? `?${q.toString()}` : ""
  return getCanonicalList<CustomerReportRow>(
    `/api/crm/reports/customers${suffix}`
  )
}
