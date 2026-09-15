import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Scaffolds a feature slice that satisfies check-feature-structure.mjs and
 * docs/conventions/feature-structure.md.
 *
 * Usage (from the repository root):
 *   bun run create:feature <app> <domain> [--api-only]
 *
 * Full mode also adds `<domain>.title` to both app locale files so the audit
 * gate stays green; it never edits Routes.tsx, federation.routes.ts or
 * policy.yaml — route ownership and authorization stay deliberate decisions.
 */

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const [, , appName, domain, ...flags] = process.argv
const apiOnly = flags.includes("--api-only")

if (!appName || !domain || !/^[a-z][a-z0-9-]*$/.test(domain)) {
  console.error("Usage: bun run create:feature <app> <domain> [--api-only]")
  console.error("  <domain> must be kebab-case, e.g. credit-limits")
  process.exit(1)
}

const appDir = join(root, "apps", appName)
const featureDir = join(appDir, "src", "features", domain)
if (!statSync(appDir, { throwIfNoEntry: false })) {
  console.error(`Unknown app "${appName}" — expected apps/${appName}/`)
  process.exit(1)
}
if (existsSync(featureDir)) {
  console.error(
    `Feature already exists: apps/${appName}/src/features/${domain}/`
  )
  process.exit(1)
}

const pascal = domain
  .split(/[^a-zA-Z0-9]+/)
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join("")
const camel = pascal[0].toLowerCase() + pascal.slice(1)

mkdirSync(featureDir, { recursive: true })
writeFile(
  join(featureDir, "types.ts"),
  `/**
 * Wire DTO + view models for the ${domain} feature.
 *
 * Wire fields mirror the backend contract (snake_case). Record the source
 * operation so the type can be swapped for the generated contract when
 * ADR-005 codegen lands:
 *   OpenAPI <operationId> | arda-be/apps/<service>/...:<line>
 */
export interface ${pascal}Record {
  id: string
}
`
)
writeFile(
  join(featureDir, "api.ts"),
  `import { getCanonicalList } from "@workspace/api"
import { buildListSearchParams, type ListQueryInput } from "@workspace/api/list"
import type { ${pascal}Record } from "./types"

/** TODO: point at the owning service (keep in sync with policy.yaml). */
const BASE_PATH = "/api/<service>/<resource>"

export const ${camel}Api = {
  list: (query: ListQueryInput = {}) =>
    getCanonicalList<${pascal}Record>(
      \`\${BASE_PATH}?\${buildListSearchParams(query).toString()}\`
    ),
}
`
)

if (apiOnly) {
  report(["api.ts", "types.ts"], false)
  process.exit(0)
}

writeFile(
  join(featureDir, "list-query.ts"),
  `import { defineServerList } from "@workspace/list-page/server-list"

export const ${camel}ListDefinition = defineServerList({
  queryKey: ["${appName}", "${domain}", "list"] as const,
  queryConfig: {
    defaultPageSize: 20,
    sortableColumns: ["created_at"],
    filters: [],
  },
} as const)
`
)
writeFile(
  join(featureDir, "page.tsx"),
  `import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { useI18n } from "@workspace/i18n"
import { ${camel}Api } from "./api"
import { ${camel}ListDefinition } from "./list-query"
import type { ${pascal}Record } from "./types"

export function ${pascal}Page(_props: { pathname: string }) {
  const { t } = useI18n()
  const { total, isLoading, isFetching, error, refetch, table } =
    useServerDataTable<${pascal}Record>({
      ...${camel}ListDefinition,
      columns: [],
      queryFn: async (query) => ${camel}Api.list(query),
    })

  return (
    <ListPageShell
      title={t("${appName}.${domain}.title")}
      totalRows={total}
      criticalPending={isLoading}
      criticalError={error ?? null}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
    />
  )
}
`
)

addLocaleKeys([["title", `TODO ${domain}`]])
report(["api.ts", "types.ts", "list-query.ts", "page.tsx"], true)

function writeFile(path, content) {
  writeFileSync(path, content)
}

function addLocaleKeys(entries) {
  for (const locale of ["vi-VN", "en-US"]) {
    const localePath = join(appDir, "locales", `${locale}.json`)
    if (!existsSync(localePath)) continue
    const bundle = JSON.parse(readFileSync(localePath, "utf8"))
    const section = (bundle[domain] ??= {})
    for (const [key, value] of entries) {
      if (typeof section[key] === "string") continue
      section[key] = value
    }
    writeFileSync(localePath, `${JSON.stringify(bundle, null, 2)}\n`)
  }
}

function report(files, withI18n) {
  console.log(
    `Created apps/${appName}/src/features/${domain}/ (${files.join(", ")})`
  )
  console.log("")
  console.log("Next steps:")
  console.log(
    "  1. Routes.tsx: lazyWithPreload(...).then((m) => ({ default: m." +
      pascal +
      "Page })) + route entry"
  )
  console.log(
    "  2. federation.routes.ts (shell): register new prefixes before adding them to the remote"
  )
  console.log(
    "  3. arda-be/apps/auth-gateway/configs/policy.yaml: add the route id/path/methods/permissions"
  )
  console.log(
    "  4. Fill types.ts from the backend contract; keep api.ts <= 300 lines"
  )
  if (withI18n) {
    console.log(
      `  5. Replace locale placeholders ${domain}.title when the screen copy is known`
    )
  }
  console.log("  6. Run: bun run check:features && bun run typecheck")
}
