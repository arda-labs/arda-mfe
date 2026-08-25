# Arda MFE Refactor Program

Status: execution in progress; migrated surfaces use the target contract directly.

Last updated: 2026-08-25

The cross-stack master plan lives in the workspace at
`arda-be/docs/refactor-program/README.md`. This document is the frontend execution
view and remains usable when the MFE repository is reviewed independently.

## 1. Outcomes

- One browser API transport and one normalized problem type.
- OpenAPI-generated or contract-checked wire types behind domain adapters.
- Consistent query keys, URL list state, pagination, cancellation and invalidation.
- Shell-owned auth/session/step-up with fail-closed remote capability checks.
- Standard upload/download/SSE adapters rather than feature-specific transport.
- Compatible independent shell/remote releases and observable remote loading.
- Redacted browser runtime, unhandled-rejection and remote-module telemetry
  emitted through one shell-owned hook; raw console logging is not the telemetry
  contract.
- No business-domain behavior hidden in shared UI or transport packages.

## 2. Target package responsibilities

| Package/app | Target responsibility |
| --- | --- |
| `apps/shell` | Session bootstrap, providers, nav, remote manifest, top-level errors/telemetry |
| `apps/<remote>` | Domain routes, pages, feature hooks, domain adapter composition |
| `@workspace/api` | HTTP base URL, credentials, request/trace correlation, abort, decode, typed problems |
| `@workspace/auth` | Normalized auth state, capability API, guards and step-up coordination |
| `@workspace/query` | Query client/provider/default retry policy |
| `@workspace/admin-list` | URL/list definitions, offset/cursor orchestration, table server state |
| `@workspace/media` | Upload/download/media protocol adapters |
| `@workspace/i18n` | UI dictionaries and stable API problem-code translations |
| `@workspace/notifications` | Inbox/SSE UI behavior after transport/session policy is standardized |
| `@workspace/ui` | Accessible presentational primitives only |

Generated API clients/types live in `packages/api/src/generated` and are
consumed by domain adapters rather than presentation components. The current
IAM type surface is the first checked-in generated reference; expanding the
same generation/drift gate to every public OpenAPI document is still a QA-02
release gate.

## 3. Required feature layering

```text
page.tsx / components
  -> feature query and mutation hooks
  -> domain API adapter and view-model mapper
  -> generated contract client/types
  -> @workspace/api transport
```

Allowed exceptions:

- direct-to-object-storage byte transfer through `@workspace/media`;
- download/stream/SSE adapters with explicit protocol handling;
- local development mock adapter selected by environment.

Raw JSON `fetch` in features, auth providers, pages, or remotes is not allowed.
The only protocol-native exception is a dedicated external-identity adapter for
Kratos UI flows; those raw Kratos/OAuth calls must explicitly preserve
`credentials: "include"` and must not be reused by domain APIs.

## 4. Shared transport contract

The transport owns:

- canonical API origin and credential mode;
- browser session cookies on every same-site/domain API request via
  `credentials: "include"`; `/api/auth/me` is an explicit regression-tested
  invariant, not an endpoint-specific choice. Its response is the canonical
  success envelope and auth consumers unwrap `result` explicitly. Kratos/OAuth
  provider responses remain isolated protocol adapters and are not passed
  through the generic envelope parser;
- `Accept`, `Content-Type`, `Accept-Language`;
  - one logical `X-Request-Id` across controlled step-up retry;
  - standard `Idempotency-Key` propagation for retryable commands;
- W3C trace integration where browser policy permits;
- `AbortSignal` and timeout/cancellation behavior;
- JSON/no-content/problem decoding;
- safe/idempotent retry policy;
  - single-flight step-up coordination;
  - normalized `ApiProblem` and request support metadata.

The repository also runs `check:credentials`, a static gate that requires every
browser-owned raw `fetch` (including the protocol-native Kratos/OAuth adapters)
to state `credentials: "include"`; Cloudflare asset/request forwarding is an
edge-owned exception because it forwards the original `Request` object.

The repository also runs `check:federation`, which verifies that every remote
has a stable `remoteEntry.js`, package version, shared singleton registry, shell
registration, route registration, type declaration and fixed port.

It does not own endpoint URLs, notification copy, query invalidation, form state,
business retries, or domain DTO mapping.

The shell installs the global browser error handlers from
`@workspace/ui/observability/browser-telemetry`. Reports are bounded and redact
email, UUID, bearer and query-token values before dispatching the
`arda:browser-error` event; production transport/export is configured by the
host rather than by feature remotes.

## 5. Wire and view models

- Public REST fields are `snake_case` in generated wire types.
- Domain adapters may expose UI-friendly models when transformation adds value.
- Date/time, decimal money, enums and nullable fields are decoded deliberately.
- Do not duplicate handwritten interfaces that silently diverge from OpenAPI.
- Intentional versioned wire mapping stays in one adapter and has a cleanup
  package/date; runtime response-shape guessing is forbidden.

## 6. Server state and lists

- TanStack Query is the source of server cache/state.
- Query keys are created by domain factories using canonical serialized parameters.
- Offset and cursor responses use different types and controls.
- Shareable list state lives in URL parameters; draft advanced filters do not fetch.
- Changing filters/sort resets the page/cursor appropriately.
- `totalRows` uses backend `total`; selection count is independent.
- Abort stale requests on navigation/filter changes.
- Mutations define exact cache update/invalidation and avoid broad global invalidation.
- Optimistic updates require conflict and rollback behavior; financial/high-risk
  state transitions default to server-confirmed UI.

## 7. Auth and authorization UX

- Shell performs `/api/auth/me` and owns session expiry/logout.
- Remotes consume normalized auth state from the singleton auth package.
- Missing roles or permissions means no capability, never allow.
- Active tenant/org comes from verified server context; browser storage is a preference only.
- Route/menu guards improve UX but do not claim backend authorization.
- 401 starts session handling; ordinary 403 stays forbidden.
- `recent_auth_required` suspends only the triggering mutation, opens one step-up,
  and retries once after verified success.
- Management screens show the target user/resource distinctly from the signed-in actor.
- Admin path mutations and target reads carry the selected resource `tenant_id`
  explicitly; an actor cookie or actor user ID is never used as a substitute.
  `/me` calls remain the only actor-bound exception.

## 8. Errors, forms and notifications

- All non-2xx JSON errors become typed RFC 9457-compatible `ApiProblem`.
- Stable problem `code` maps to i18n; backend `detail` is safe fallback/support text.
- `errors[]` field paths map to React Hook Form/Zod field names through one utility.
- Conflicts, forbidden and business-state errors are not forced into field errors.
- Request ID is copyable in support-facing error UI.
- Features choose presentation (inline/banner/toast/dialog); the transport does not emit UI.
- Realtime notifications and API operation outcomes are separate concepts.

## 9. Upload, download and realtime

### Upload

- Create session through Media JSON API.
- Validate declared size/type constraints before upload for UX.
- Upload bytes directly using returned method/headers/parts.
- Track cancellation/retry/multipart progress without exposing presigned URLs to logs.
- Complete session idempotently and use durable media ID.

### Download

- Use browser/native streaming; preserve filename/content type/range behavior.
- Handle 401/403/404 and expired signed URL through normalized control flow.

### SSE

- One owned connection policy with heartbeat, bounded reconnect/backoff, session
  expiry, last-event ID and cleanup on logout/unmount.
- Do not open duplicate per-component streams for the same inbox.

## 10. Module Federation compatibility

- `federation.shared.ts` remains the only shared singleton declaration source.
- Publish immutable remote artifacts and a versioned manifest.
- Check shell current + previous supported contract against changed remote.
- A shared package change merges/releases before dependent remotes switch.
- Remote error boundaries report a redacted route/error through the shared hook
  and preserve shell function.
- Browser runtime and unhandled-promise errors use the same redacted telemetry
  hook as remote boundaries; no raw error object is emitted as an application
  event.
- Measure remoteEntry, route chunk, API wait and JS/render time separately.
- Keep route-intent preload and cached remote promises unless measurement supports change.

## 11. Testing requirements

### Foundation

- transport decode/no-content/problem/abort/retry/step-up tests;
- generated client drift check;
- query-key and URL serialization tests;
- auth fail-closed and verified-org tests;
- upload/SSE lifecycle tests;
- cookie credential regression for `/api/auth/me`, explicit credentials on raw
  Kratos/OAuth adapters, and `withCredentials: true` for authenticated SSE;
- shell/remote compatibility build matrix.

### Feature slice

- characterization fixture for legacy response if migrating;
- happy, empty, loading, abort, validation, forbidden, recent-auth, conflict and 5xx states as applicable;
- contract fixture and mock server generated from/validated against OpenAPI;
- component accessibility and focus behavior;
- selected browser E2E through real gateway in integration/staging.

Repository checks remain at least:

```text
bun install --frozen-lockfile
bun run check:packages
bun run typecheck
bun run lint
bun run build
```

Additional test/contract/bundle commands are added in the foundation phase.

## 12. Frontend phases

### FE-0 — Inventory and baseline

- Map every feature API call, raw fetch, expected response, error handling and query key.
- Record shell/remote dependency versions, cold/warm route metrics and current E2E coverage.
- Identify auth organization-response mismatch and fail-open permission consumers.

Exit: every API consumer has an operation owner and migration wave.

### FE-1 — Security containment

- Make missing capability data fail closed.
- Consume only verified org context.
- Stabilize auth/session/step-up request behavior without changing every domain response.
- Remove production auth raw-fetch exceptions once shared transport can cover them safely.

Exit: auth negative tests and actor/target management behavior pass.

### FE-2 — Foundations

- Implement unified transport, `ApiProblem`, generated adapter pattern, standard
  lists, upload/SSE adapters, contract fixtures, telemetry and federation gates.

Exit: a fixture/reference feature uses all foundations without domain-specific forks.

### FE-3 — Pilots

- One paginated list, one high-risk target command and one media lifecycle.
- Deploy with compatible adapters and observe real telemetry.

Exit: pilot retrospective approves scaling.

### FE-4 — IAM/account/platform

- Migrate vertically by feature, not by replacing every API file in one PR.
- Remove old adapters after observed compatibility window.

### FE-5 — CRM/HRM/Finance

- Migrate domain lists/forms/commands with matching backend slices.
- Finance commands wait for backend idempotency/concurrency guarantees.

### FE-6 — Workflow/media/notifications

- Standardize operations, workflow states, media protocol and inbox/SSE behavior.

### FE-7 — Hardening and cleanup

- Current/previous release matrix, browser performance/accessibility/security pass.
- Remove legacy clients, duplicate types, raw JSON fetches and expired feature switches.
- Update `AGENTS.md` and architecture docs to target-state truth.

## 13. Per-feature definition of done

- Contract operation and policy are accepted.
- Shared transport + generated/domain adapter used.
- No duplicate handwritten wire model or raw JSON fetch.
- Query/list/cache/cancellation behavior is deterministic.
- Auth, actor/target and error/i18n behavior is tested.
- Accessibility and responsive behavior pass.
- Remote independent build and shell compatibility pass.
- API/remote telemetry and request ID are observable.
- Rollout and cleanup package IDs are recorded.

## 14. Safe subagent split

After foundation contracts merge, one feature can be split as:

1. Contract fixture/update agent.
2. Domain adapter/query hook agent.
3. Page/component migration agent.
4. Browser/component test agent.

Agents 2 and 3 should not both edit the same feature API file. A single integrator
owns shared transport/auth/query package changes during each foundation milestone.

Workflow role-membership management carries an explicit `tenant_id` query target
for list/create/update; task/work-item APIs derive tenant scope from the verified
session/context rather than a browser-selected filter.
