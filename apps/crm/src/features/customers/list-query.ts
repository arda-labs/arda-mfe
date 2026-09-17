import {
  defineServerList,
  type ServerListQueryConfig,
} from "@workspace/list-page/server-list"

export const CUSTOMERS_DEFAULT_PAGE_SIZE = 20

/**
 * URL-synced server-list contract for the CRM customer record lists.
 *
 * The toolbar text filter is attached to the `customer_code` column but is
 * remapped to the API `q` parameter: the BE ILIKEs it over code / name /
 * mobile / identity number / id (`crm-service` ListCustomers), which is the
 * same search the legacy client-side form performed.
 *
 * `sortableColumns: []` is deliberate: the endpoint always orders by
 * `updated_at DESC` and ignores `sort`/`order`, so no column exposes sorting
 * and a hand-typed `?sort=` never reaches the API.
 */
const customersQueryConfig: ServerListQueryConfig = {
  defaultPageSize: CUSTOMERS_DEFAULT_PAGE_SIZE,
  filters: [{ urlKey: "customer_code", apiKey: "q", mode: "text" }],
  sortableColumns: [],
}

/**
 * Separate query keys per route: `riskOnly` comes from the route (not from
 * the URL), so a shared key would let the profiles cache answer the risk list
 * (and vice versa) when the two routes are visited with the same page/perPage.
 */
export const customerProfilesListDefinition = defineServerList({
  queryKey: ["crm", "customers", "profiles", "list"] as const,
  queryConfig: customersQueryConfig,
})

export const customerRiskListDefinition = defineServerList({
  queryKey: ["crm", "customers", "risk", "list"] as const,
  queryConfig: customersQueryConfig,
})
