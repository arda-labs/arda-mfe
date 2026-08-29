# Arda MFE

Bun + Vite micro frontend workspace for Arda.

## Docs index

- Architecture, federation rules, code conventions, commands: [AGENTS.md](AGENTS.md)
- Topic guides: [docs/conventions/](docs/conventions/)
- Refactor program status: [docs/refactor-program.md](docs/refactor-program.md)

## Apps

| App        | Port | Role                                          |
| ---------- | ---- | --------------------------------------------- |
| `shell`    | 5000 | Layout, auth, navigation, lazy remote loading |
| `iam`      | 5101 | IAM admin remote                              |
| `platform` | 5102 | Platform master data remote                   |
| `finance`  | 5103 | Finance operations remote                     |
| `account`  | 5104 | Profile & account settings remote             |
| `hrm`      | 5105 | HRM remote                                    |
| `workflow` | 5106 | Workflow / BPMN admin remote                  |
| `crm`      | 5107 | CRM & workbench remote                        |

## Packages

| Package                    | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `@workspace/api`           | HTTP client, URL resolver, list transport contract  |
| `@workspace/query`         | TanStack Query client and cache policy              |
| `@workspace/ui`            | Design system, generic table and feedback UI        |
| `@workspace/admin-list`    | URL/search/filter/list page orchestration           |
| `@workspace/auth`          | Session, step-up, auth store and API auth bridge    |
| `@workspace/i18n`          | Locales and `translateApiError`                     |
| `@workspace/notifications` | Notification inbox, stream and browser push         |
| `@workspace/theme`         | Theme, appearance and branding                      |
| `@workspace/media`         | Media API and URL helpers                           |
| `@workspace/ai`            | Olorin assistant panel: provider wrapper, tool renderer registry, approval card, fixtures |

Dependency direction is enforced by `bun run check:packages`. Workspace code
must import package exports, never another package's `src` directory. The only
exception is the shell Module Federation share bootstrap, which must seed shared
modules before lazy chunks are evaluated.

## Structure conventions

Feature folders follow a consistent layout. See [AGENTS.md §3](AGENTS.md).

```text
apps/<remote>/src/features/<domain>/
  api.ts
  <entity>/
    page.tsx
```

**Rules of thumb**

- `Routes.tsx` only — remotes expose `./Routes` via Module Federation.
- `page.tsx` target ≤ 400 lines; split into `components/` when larger.
- Heavy dependencies (BPMN, large forms): `lazy()` at tab/dialog open.
- Server state: `@workspace/query`; server-backed lists use
  `@workspace/admin-list/server-list` instead of page-local fetch effects.
  Migration checklist: [docs/conventions/server-list-migration.md](docs/conventions/server-list-migration.md);
  working exemplar: `apps/finance/src/features/finance/transactions/page.tsx`.
- List URL state: declare one filter/search mapping with `defineServerList` and
  reuse it for table filters and advanced search.

## Business areas

- **IAM** — users, groups, roles, permissions, audit, system settings
- **Platform** — orgs, areas, lookups, templates, geo reference data
- **Finance** — accounts, transactions, approvals, trial balance, accounting config
- **HRM** — positions, job titles, org units, registrations, employees
- **Account** — profile, security, sessions, devices, appearance
- **Workflow** — case types, process config, SLA, templates, roles, BPMN monitoring (Zeebe 8.5)
- **CRM** — customers, workbench (transaction ops, drafts)

Workflow admin lives in `apps/workflow` (not shell). BPMN viewer/modeler: `apps/workflow/src/features/workflow/components/bpmn-monitor.tsx`.

## AI assistant (Olorin)

The shell ships a global assistant dock (Ctrl/Cmd+J) backed by
`@workspace/ai`, which wraps CopilotKit headless state behind Arda-owned UI.
CopilotKit must stay inside the package; apps import only `@workspace/ai`.

- Enabled by default. Set `VITE_AI_ENABLED=false` (build variable) to disable.
  Legacy route `/ai-protocol-spike` follows `VITE_AI_PROTOCOL_SPIKE` with the
  same default-on rule. Full page: `/ai`.
- **Docked side panel** (`ShellLayout`): opens from the "Ask AI" header button,
  resizes by dragging its left edge (320–720px, persisted in
  `localStorage["arda-ai-panel-width"]`), and offers an expand action that
  switches to the full-screen workspace dialog (`OlorinWorkspace`) with a
  ChatGPT-style thread sidebar (switch/delete threads) and Escape to exit.
- Markdown rendering for assistant messages (react-markdown + remark-gfm with
  a hover copy button), typing indicator, and a rounded Cloudflare-style
  composer.
- Threads are real: list/switch/delete via the backend conversations API
  (`useOlorinConversations`, auto-refresh after each run); new conversations
  get server-side titles from the first user message.
- Runtime URL is always `apiUrl() + "/api/copilotkit"` with
  `credentials: "include"` so session cookies ride on the correct host.
- Offline previews without a backend:
  `/ai?olorin-fixture=customerLookup|knowledgeCitations|approvalPending`.
- Tool renderers and page context are registered by remotes through
  `registerToolRenderer` / `registerOlorinContext`; nothing registers yet —
  CRM is the first candidate.
- Backend requirements live in `arda-be/apps/ai-service/README.md`
  (`AI_ENABLE_AGENT`, HITL flags, conversation APIs) and the Go-native
  envelope contract in `arda-be/docs/ai/go-native-copilotkit.md`.

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run check:packages
bun run typecheck
bun run format
```

Build order: remotes first, shell last (`bun run build`).

## Cloudflare Workers deployment

The shell and every Module Federation remote are separate Workers deployment
units while retaining the same-origin URL contract on `arda.io.vn`.

```bash
bun run cf:build iam
bun run cf:deploy iam
```

The shell owns frontend routes under `arda.io.vn/*`. Production browser API
requests use `https://api.arda.io.vn/api/*`, which goes through Cloudflare
Tunnel directly to `auth-gateway` in k3s and does not invoke the shell Worker.
Each remote owns its more-specific `arda.io.vn/mfes/<name>/*` route.

Shared API URL resolution keeps local development on relative `/api/*` paths
and switches only the production `https://arda.io.vn` origin to
`https://api.arda.io.vn`. Fetch, SSE, and media URLs must use the shared
resolver/client so credentialed cross-origin requests remain consistent.

All eight Workers are connected directly to `arda-labs/arda-mfe` through
Cloudflare Workers Builds. Pushes to `main` deploy production; non-production
branches create preview versions. Build watch paths keep app-only changes scoped
to that deployment unit, while shared packages and Cloudflare build files trigger
all units. Cloudflare manages the build token, so GitHub deployment secrets are
not required.

## Adding UI components

Run shadcn from the workspace root target:

```bash
bunx --bun shadcn@latest add button -c apps/shell
```

Import from the shared package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Skills & rules

- Agent guide: [AGENTS.md](AGENTS.md)
- Feature page template: skill `arda-feature-page`
- New remote: skill `arda-mfe-remote`
