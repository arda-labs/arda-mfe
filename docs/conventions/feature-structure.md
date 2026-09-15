# Feature Structure Convention

Status: active. Enforced by `bun run check:features`
(`scripts/check-feature-structure.mjs`) inside `bun run typecheck`.

Reference slices: `apps/iam/src/features/users/` (full), `apps/ai/src/features/knowledge/`
(medium), `apps/platform/src/features/organizations/` (server list),
`apps/platform/src/features/{organizations,parameters,lookups,shared}/api.ts` (split pilot).
This document is the contract for new features and for the migration waves tracked in §6.

## 1. Target layout

```text
apps/<app>/src/features/
├── <domain>/                    # one bounded context = one route namespace
│   ├── api.ts                   # HTTP calls + wire→view adapters  (<= 300 lines)
│   ├── types.ts                 # wire DTO + view models + params (<= 250 lines)
│   ├── list-query.ts            # defineServerList contract (server lists only)
│   ├── hooks.ts                 # useQuery/useMutation + invalidation (when needed)
│   ├── index.ts                 # optional public surface: api/types/keys only
│   ├── page.tsx                 # route entry, <= 400 lines (check:pages)
│   ├── schema.ts                # zod schemas + form defaults
│   └── components/              # dialogs, tables, panels
└── shared/                      # app-level helpers: query params, cross-domain types, UI
```

When `api.ts` outgrows 300 lines, split it into a directory and keep the import path
stable through a barrel:

```text
features/finance/api/            # was features/finance/api.ts
├── index.ts                     # export * from "./accounts" etc. — compatibility facade
├── accounts.ts
├── journal.ts
└── posting.ts
```

## 2. Rules

| # | Rule | Why |
| - | - | - |
| R1 | API modules stay small (`api.ts` <= 300, `types.ts` <= 250). Split by resource, not by request. | Reviewable diffs, one owner per resource |
| R2 | Only feature api modules may import transport values (`api`, `getCanonical*`, `postCanonical`, client factories) from `@workspace/api*`. Type-only imports and pure helpers (`downloadFile`, `buildListSearchParams`, `serializeListQuery`) stay available to every layer. Shell bootstrap (`apps/shell`) is the only approved exception. | One transport seam; components never build URLs |
| R3 | Cross-feature imports may only reach a feature's `api.ts` / `types.ts` / `list-query.ts` / `index.ts`. Never its `components/` or `page`. The app-level `features/shared/` area is public. | No UI internals leaking between domains |
| R4 | `api.ts` is framework-free: no React, no i18n keys, no table columns, no label specs. Those live in `components/` (see `apps/loan/src/features/adjustments/kind-spec.ts`). | Adapters stay testable and codegen-friendly |
| R5 | Wire types state their source in a doc comment: `OpenAPI <operationId>` when a spec exists, otherwise `arda-be/apps/<service>/...:<line>`. When ADR-005 codegen lands, `types.ts` re-exports the generated type — consumers do not change. | Auditable contract, no silent divergence |
| R6 | Query keys come from a factory: server lists via `defineServerList` in `list-query.ts`, everything else via a `keys.ts`/`list-query.ts` export. No new inline key literals. | Deterministic invalidation |
| R7 | Mutations run through `hooks.ts` (`useMutation` + `invalidateQueries({ queryKey: xxxKeys.all })`) once a feature has more than a trivial refresh. Pages call hooks, not transport. | Cache correctness instead of ad-hoc refetch |
| R8 | Code shared by two or more apps is a workspace package (`@workspace/api/generated/*` for wire types, a dedicated client package for stateless helpers) registered in `federation.shared.ts` (`remoteSharedDeps` or `sharedWorkspaceExemptions` with a justification). Never deep-import another app. | Federation policy stays green |

### R2 examples

```ts
// features/<domain>/api.ts — correct
export const creditLimitApi = {
  list: (query: ListQueryInput = {}) =>
    getCanonicalList<CreditLimit>(`/api/loan/credit-limits?${buildListSearchParams(query)}`),
}
```

```ts
// features/<domain>/page.tsx — wrong: transport in a component
import { getCanonicalList } from "@workspace/api"
const rows = await getCanonicalList<Row>("/api/loan/credit-limits")
```

### R4 examples

```ts
// wrong — label keys/UI spec inside the adapter
export const loanAdjustmentKinds = [{ key: "waiver", labelKey: "loan.kind.waiver" }]

// right — API kinds only; labels live with the screen
export const loanAdjustmentKinds = ["waiver", "writeoff"] as const
```

## 3. Contract and codegen seam

`docs/refactor-program.md` §2-3 and `arda-be/docs/refactor-program/phase-0/adr-register.md`
(ADR-005) define the target: page → feature hooks → domain adapter → generated
contract types → `@workspace/api` transport. Until specs exist for a service, the seam
is `types.ts` (R5). When a spec lands:

1. Generate types into `packages/api/src/generated/<service>-v1.ts` (subpath export in
   `packages/api/package.json`).
2. `types.ts` re-exports the generated type and keeps only view-model mapping.
3. Delete handwritten duplicates; `check:features` keeps everything else honest.

Generated type packages are stateless and erased at build; if two or more apps import
them, register the exemption in `federation.shared.ts`:
`"@workspace/contracts": "generated wire types only; erased at build"`.

## 4. Adding a new feature

```bash
bun run create:feature <app> <domain>          # api.ts, types.ts, list-query.ts, page.tsx + locale title
bun run create:feature <app> <domain> --api-only
```

Then follow the scaffold checklist: register the route in the remote `Routes.tsx` and
`federation.routes.ts`, add the auth-gateway route in
`arda-be/apps/auth-gateway/configs/policy.yaml`, fill `types.ts` from the backend
contract, keep `api.ts` within the size limit, and run `bun run check:features && bun run typecheck`.

### Adapter tests

Feature adapters keep their pure query/param builders exported (for example
`organizationListSearch` in `apps/platform/src/features/organizations/api.ts`) and get a
`bun test` file under `apps/<app>/tests/`. No new dependency is required — the repository
already runs Bun's test runner. Run `bun run test:features` locally; CI executes it in the
`frontend` job.

For catalog/master-data screens follow
[`catalog-crud-page`](../../../.agents/skills/catalog-crud-page/SKILL.md) and
[`server-list-migration.md`](./server-list-migration.md). Sort/filter contracts stay
1:1 with the backend whitelist.

## 5. Gate and baselines

`check:features` enforces R1-R4 statically (TypeScript AST import analysis plus line
counts). Legacy files are recorded as dated baselines inside the script and must be
removed in the same PR that shrinks the file:

- `LEGACY_BASELINE` — empty since W4; a new oversized api file fails immediately.
- `TRANSPORT_BOUNDARY_BASELINE` — only the approved shell session bootstrap
  (`apps/shell/src/App.tsx`).
- `CROSS_FEATURE_BASELINE` — empty since W4; cross-feature UI reuse goes through
  the owning feature's `index.ts` (see `apps/loan/src/features/loan-batches/index.ts`).

Baselines are debt, not exemptions: every new feature must be compliant from day one.

## 6. Migration waves

| Wave | Scope | State |
| - | - | - |
| W0 | Gate, convention, scaffolder, skill updates, `test:features` in CI | landed |
| W1 | Pilot: `apps/platform/src/features/api.ts` → per-domain modules + adapter tests | landed (`apps/platform/tests/feature-api.test.ts`) |
| W2 | `finance` + `workflow` (`api/` directory + `api/index.ts` barrel; workflow `iam-reference-api.ts` folded into `api/iam-reference.ts`) | landed (`apps/workflow/tests/feature-api.test.ts`, `apps/finance/tests/feature-api.test.ts`) |
| W3 | `loan` (largest; `features/api/` barrel keeps 40 existing importers and the `loanApi` facade) | landed (`apps/loan/tests/feature-api.test.ts`) |
| W4 | Small apps (`crm`, `deposit`, `statistical`, `workbench`) + the ten transport-boundary files + loan batch cross-feature imports | landed (all three baselines empty) |
| W5 | Remove remaining facades/aggregates, add mutation hooks when touching a feature, per-domain co-location inside the `api/` directories | ongoing |

Consumers are protected by barrels during a wave; removing a barrel is an explicit
step with a `check:features` signal (no baseline entry left behind).
