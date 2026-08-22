# Arda MFE

Bun + Vite micro frontend workspace for Arda.

## Apps

| App | Port | Role |
| --- | --- | --- |
| `shell` | 5000 | Layout, auth, navigation, lazy remote loading |
| `iam` | 5101 | IAM admin remote |
| `platform` | 5102 | Platform master data remote |
| `finance` | 5103 | Finance operations remote |
| `account` | 5104 | Profile & account settings remote |
| `hrm` | 5105 | HRM remote |
| `workflow` | 5106 | Workflow / BPMN admin remote |
| `crm` | 5107 | CRM & workbench remote |

## Packages

| Package | Purpose |
| --- | --- |
| `@workspace/ui` | Shared shadcn/ui components |
| `@workspace/api` | HTTP client |
| `@workspace/auth` | Session, step-up, auth store |
| `@workspace/core` | List API, query helpers, routing hooks |
| `@workspace/i18n` | Locales, `translateApiError` |
| `@workspace/notifications` | Toast / notify |
| `@workspace/theme` | Theme tokens |
| `@workspace/media` | Media URL helpers |

## Structure conventions

Feature folders follow a consistent layout. See [docs/conventions/mfe-structure.md](../docs/conventions/mfe-structure.md).

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
- Server state: page-local React primitives (useState/useEffect/useCallback), direct API calls, no generic cache/invalidation layer.
- URL state: React Router useSearchParams.

## Business areas

- **IAM** — users, groups, roles, permissions, audit, system settings
- **Platform** — orgs, areas, lookups, templates, geo reference data
- **Finance** — accounts, transactions, approvals, trial balance, accounting config
- **HRM** — positions, job titles, org units, registrations, employees
- **Account** — profile, security, sessions, devices, appearance
- **Workflow** — case types, process config, SLA, templates, roles, BPMN monitoring (Zeebe 8.5)
- **CRM** — customers, workbench (transaction ops, drafts)

Workflow admin lives in `apps/workflow` (not shell). BPMN viewer/modeler: `apps/workflow/src/features/workflow/components/bpmn-monitor.tsx`.

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
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

The shell owns `arda.io.vn/*` and forwards `/api/*` to the existing DNS origin
(Cloudflare Tunnel into k3s). Each remote owns its more-specific
`arda.io.vn/mfes/<name>/*` route.

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

- Cursor rule: `.cursor/rules/frontend-mfe.mdc`
- Feature page template: skill `arda-feature-page`
- New remote: skill `arda-mfe-remote`
