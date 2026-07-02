# Arda MFE

Bun + Vite micro frontend workspace for Arda.

## Apps

- `apps/shell` owns layout, auth, top-level navigation, customer placeholders, and workflow admin screens.
- `apps/iam` exposes the IAM remote at `remoteEntry.js`.
- `apps/platform` exposes the Platform remote at `remoteEntry.js`.
- `apps/finance` exposes the Finance remote at `remoteEntry.js`.
- `apps/account` exposes the Account remote at `remoteEntry.js`.
- `packages/ui` contains shared shadcn/ui components.
- `packages/api`, `auth`, `core`, `i18n`, `media`, `notifications`, and `theme` contain shared app contracts and client helpers.

## Current Business Areas

Shell navigation includes:

- Customer member operations: registrations, profiles, risk cases. These are placeholders until the CRM/customer MFE owns the screens.
- Finance operations: incoming transactions, outgoing transactions, transaction search, and accounting configuration.
- Workflow administration: case types, process configs, SLA policies, description templates, roles, and monitoring.

Finance operation screens live in `apps/finance/src/features/finance/operation`.

Workflow admin screens live in `apps/shell/src/features/workflow`. The BPMN viewer/modeler module is split into `apps/shell/src/features/workflow/components/bpmn-monitor.tsx`.

## Workflow UI Notes

The shell workflow area is Arda-owned UX for Zeebe 8.5. It does not depend on Camunda Tasklist, Operate, or Optimize for product operation.

Implemented UI pieces:

- Case type catalog.
- Process configuration.
- SLA policy editor with task rows.
- Description template builder with subsystem and token preview.
- Process role, role catalog, membership, assignment rule, and delegation management.
- Process monitoring list/detail.
- BPMN import/update/deploy and fullscreen modeler dialog using `bpmn-js`.

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
bun run format
```

## Dev Ports

| App | Port |
| --- | --- |
| `apps/shell` | `5000` |
| `apps/iam` | `5101` |
| `apps/platform` | `5102` |
| `apps/finance` | `5103` |
| `apps/account` | `5104` |

## Adding Components

Run shadcn from the target app:

```bash
bunx --bun shadcn@latest add button -c apps/shell
```

```tsx
import { Button } from "@workspace/ui/components/button"
```
