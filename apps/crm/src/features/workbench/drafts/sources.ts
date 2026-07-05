import { api } from "@workspace/api"
import type { Customer, CustomerStatus } from "../../customers/api"
import type {
  PlatformDraft,
  PlatformDraftDomain,
  PlatformDraftSource,
  PlatformDraftsResult,
} from "./types"

interface FinanceTransaction {
  id: string
  direction?: "INCOMING" | "OUTGOING"
  sourceRef?: string
  description?: string
  counterpartyName?: string
  txnType?: string
  status?: string
  currentStep?: string
  amount?: string
  currency?: string
  createdAt?: string
  postedAt?: string
}

interface EmployeeRegistration {
  id: string
  registration_code: string
  payload: string
  status: string
  updated_at: string
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }
  const suffix = search.size ? `?${search.toString()}` : ""
  return `${path}${suffix}`
}

function normalizeItems<T>(
  data: T[] | Record<string, T[] | undefined>,
  key: string
): T[] {
  if (Array.isArray(data)) return data
  return data.items ?? data[key as keyof typeof data] ?? []
}

function isFinanceDraft(item: FinanceTransaction) {
  const step = (item.currentStep ?? "").toUpperCase()
  const status = (item.status ?? "").toUpperCase()
  return step === "DRAFT" || status === "DRAFT"
}

function financeDraft(
  item: FinanceTransaction,
  domain: Extract<
    PlatformDraftDomain,
    "finance_incoming" | "finance_outgoing"
  >
): PlatformDraft {
  const isOutgoing = domain === "finance_outgoing"
  const code = item.sourceRef || item.id
  const workbenchPath = isOutgoing
    ? "/workbench/outgoing-transactions"
    : "/workbench/incoming-transactions"

  return {
    id: item.id,
    domain,
    code,
    title: item.description || item.txnType || code,
    subtitle: item.counterpartyName,
    status: item.status ?? "DRAFT",
    displayStatus: "DRAFT",
    updatedAt: item.createdAt || item.postedAt || "",
    openHref: `${workbenchPath}?caseCode=${encodeURIComponent(code)}`,
    canCancel: false,
  }
}

function crmDraft(item: Customer): PlatformDraft {
  const displayStatus =
    item.status === "NEEDS_CHANGES" ? "NEEDS_CHANGES" : "DRAFT"

  return {
    id: item.id,
    domain: "crm_customer_registration",
    code: item.customerCode || item.id.slice(0, 8),
    title: item.name || "—",
    subtitle: item.mobile || item.identityNo || undefined,
    status: item.status,
    displayStatus,
    updatedAt: item.updatedAt,
    openHref: `/customers/registrations?customerId=${encodeURIComponent(item.id)}`,
    canCancel: item.status === "DRAFT" || item.status === "NEEDS_CHANGES",
  }
}

function hrmTitle(payload: string, fallback: string) {
  try {
    const parsed = JSON.parse(payload) as { full_name?: string }
    return parsed.full_name?.trim() || fallback
  } catch {
    return fallback
  }
}

function hrmDraft(item: EmployeeRegistration): PlatformDraft {
  return {
    id: item.id,
    domain: "hrm_employee_registration",
    code: item.registration_code,
    title: hrmTitle(item.payload, item.registration_code),
    status: item.status,
    displayStatus: "DRAFT",
    updatedAt: item.updated_at,
    openHref: "/hrm/registrations",
    canCancel: false,
  }
}

async function fetchCrmDrafts(): Promise<PlatformDraft[]> {
  const statuses: CustomerStatus[] = ["DRAFT", "NEEDS_CHANGES"]
  const groups = await Promise.all(
    statuses.map((status) =>
      api.get<Customer[] | { items?: Customer[] }>(
        withQuery("/api/crm/customers", { status })
      )
    )
  )
  return groups
    .flatMap((data) => normalizeItems(data, "items"))
    .map(crmDraft)
}

async function fetchFinanceDrafts(
  operation: "incoming" | "outgoing"
): Promise<PlatformDraft[]> {
  const domain =
    operation === "incoming" ? "finance_incoming" : "finance_outgoing"
  const data = await api.get<
    | FinanceTransaction[]
    | { transactions?: FinanceTransaction[]; items?: FinanceTransaction[] }
  >(withQuery(`/api/finance/${operation}-transactions`, { size: 100 }))

  return normalizeItems(data, "transactions")
    .filter(isFinanceDraft)
    .map((item) => financeDraft(item, domain))
}

async function fetchHrmDrafts(): Promise<PlatformDraft[]> {
  const data = await api.get<
    EmployeeRegistration[] | { items?: EmployeeRegistration[] }
  >(withQuery("/api/hrm/employee-registrations", { status: "draft" }))

  return normalizeItems(data, "items").map(hrmDraft)
}

async function loadSource(
  source: PlatformDraftSource,
  loader: () => Promise<PlatformDraft[]>
): Promise<{ source: PlatformDraftSource; items: PlatformDraft[]; error?: string }> {
  try {
    const items = await loader()
    return { source, items }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không tải được nguồn nháp"
    return { source, items: [], error: message }
  }
}

export async function fetchPlatformDrafts(): Promise<PlatformDraftsResult> {
  const results = await Promise.all([
    loadSource("crm", fetchCrmDrafts),
    loadSource("finance_incoming", () => fetchFinanceDrafts("incoming")),
    loadSource("finance_outgoing", () => fetchFinanceDrafts("outgoing")),
    loadSource("hrm", fetchHrmDrafts),
  ])

  const errors: PlatformDraftsResult["errors"] = {}
  const items: PlatformDraft[] = []

  for (const result of results) {
    if (result.error) {
      errors[result.source] = result.error
    }
    items.push(...result.items)
  }

  items.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return { items, errors }
}
