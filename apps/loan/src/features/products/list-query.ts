import { defineServerList } from "@workspace/list-page/server-list"

export const PRODUCTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for credit products. BE whitelist (loan-service
 * productListSpec): sort in {code, name, created_at}; q covers code + name
 * via SQL ILIKE so one text filter is enough; is_active accepts a
 * true/false CSV filter. Column ids must equal these keys 1:1.
 */
export const productsListDefinition = defineServerList({
  queryKey: ["loan", "products", "list"] as const,
  queryConfig: {
    defaultPageSize: PRODUCTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "is_active",
        mode: "multi",
        allowedValues: ["true", "false"],
      },
    ],
  },
} as const)
