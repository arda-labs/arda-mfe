# Arda MFE

Vite micro frontend workspace for Arda.

## Apps

- `apps/shell` owns layout, auth, and top-level navigation.
- `apps/iam` exposes the IAM remote at `remoteEntry.js`.
- `packages/ui` contains shared shadcn/ui components.

## Commands

```bash
bun install
bun run dev
bun run build
```

Shell runs on `5000`; IAM runs on `5101`.

## Adding components

Run shadcn from the target app:

```bash
bunx --bun shadcn@latest add button -c apps/shell
```

```tsx
import { Button } from "@workspace/ui/components/button";
```
