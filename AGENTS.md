# AGENTS.md

## Cursor Cloud specific instructions

Durable, non-obvious notes for the Bun + Vite micro-frontend workspace inside a
Cursor Cloud VM. Standard commands are in `README.md` / `package.json`
(`bun install`, `bun run dev|build|lint|typecheck|format`). Bun `1.3.14` and Node
`>=20` are provisioned; `bun` lives at `$HOME/.bun/bin/bun`.

### Known pre-existing lint/build failures (not environment issues)
- `bun run typecheck` passes for all apps/packages.
- `bun run lint` exits non-zero: the `workflow` app has pre-existing
  `react-refresh/only-export-components` errors in
  `apps/workflow/src/features/workflow/shared/admin-ui.tsx`.
- `bun run build` exits non-zero: the `iam` remote fails with
  `MISSING_EXPORT "toast" ... react-toastify` from the Module Federation shared
  virtual module (`crm`/`finance`/`platform` build fine). Development mode
  (`bun run dev`) works.

### Auth backend is not reachable — how to actually render the UI
The app has no mock-auth mode. On load, `AuthGuard` calls `GET /api/auth/me` and,
on failure, redirects to Ory Hydra (`auth.arda.io.vn`) / Kratos. In the Cloud VM
the auth BFF (`auth-gateway`) and the Ory identity stack are **not reachable**
(see `arda-be/AGENTS.md`), so a real login cannot complete, and remotes cannot
render standalone (`bun run --filter <remote> dev` throws a Module Federation
"host component is missing" error — remotes must be loaded by the `shell` host).

To exercise the real UI end-to-end in the VM:
1. Run the shell host: `bun run --filter shell dev` (serves :5000). The shell
   proxies all `/api/*` to `http://localhost:8082` (see `apps/shell/vite.config.ts`).
2. Run the remote you want to view, e.g. `bun run --filter platform dev` (:5102).
   The shell lazy-loads it on navigation.
3. Provide something on :8082 that `AuthGuard` accepts. A minimal dev stand-in
   for `auth-gateway` that returns a superadmin JSON for `GET /api/auth/me`
   (fields: `sub`, `email`, `roles:["SUPER_ADMIN"]`, `permissions:["superadmin"]`,
   `orgIds:[]`) and reverse-proxies `/api/platform/*` to a locally-running
   `platform-service` (:8091) is enough to render the authenticated workspace and
   perform real reads/writes (e.g. create an Organization) against the backend.

There are no `.env` files; API base URLs are relative `/api/*` and resolved by the
shell's Vite dev proxy.
