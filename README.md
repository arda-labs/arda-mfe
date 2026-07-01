# Arda MFE

Bun + Vite micro frontend workspace for Arda.

## Apps

- `apps/shell` owns layout, auth, and top-level navigation.
- `apps/iam` exposes the IAM remote at `remoteEntry.js`.
- `apps/platform` exposes the Platform remote at `remoteEntry.js`.
- `apps/finance` exposes the Finance remote at `remoteEntry.js`.
- `apps/account` exposes the Account remote at `remoteEntry.js`.
- `packages/ui` contains shared shadcn/ui components.
- `packages/api`, `auth`, `core`, `i18n`, `media`, `notifications`, and `theme` contain shared app contracts and client helpers.

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

## Adding components

Run shadcn from the target app:

```bash
bunx --bun shadcn@latest add button -c apps/shell
```

```tsx
import { Button } from "@workspace/ui/components/button";
```
