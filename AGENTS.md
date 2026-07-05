# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

`arda-mfe` is a **frontend-only** Bun + Vite Module Federation monorepo (Bun workspaces: `apps/*`, `packages/*`). One host `shell` (port 5000) lazy-loads 7 remotes at runtime: `iam` 5101, `platform` 5102, `finance` 5103, `account` 5104, `hrm` 5105, `workflow` 5106, `crm` 5107. There is **no backend in this repo** — the shell dev server proxies `/api/*` to an external gateway at `http://localhost:8082` which is not part of this codebase.

Package manager is **Bun 1.3.14** (matches `packageManager` in `package.json`; Node >= 20). Standard scripts live in the root `package.json` and `README.md` — use those (`bun run dev|build|lint|typecheck|format`).

### Running services (non-obvious caveats)

- `bun run dev` first runs `scripts/clear-dev-ports.mjs` (frees 5000/5101-5107), then starts the shell + all 7 remotes in parallel. It is long-running — start it in a background/tmux session, not a blocking foreground command.
- Ports are **fixed and strict**: the shell hardcodes each remote's `remoteEntry.js` URL (see `federation.shared.ts`) and remotes use `strictPort`. If a remote's port is taken, that section of the app fails to load with no fallback. Remote entry URLs can be overridden with env vars (`IAM_REMOTE_ENTRY`, `PLATFORM_REMOTE_ENTRY`, `FINANCE_REMOTE_ENTRY`, `HRM_REMOTE_ENTRY`, `ACCOUNT_REMOTE_ENTRY`, `CRM_REMOTE_ENTRY`, `WORKFLOW_REMOTE_ENTRY`).
- On startup each remote logs `Cannot optimize dependency: @workspace/i18n / @workspace/theme, present in client 'optimizeDeps.include'` — this is a harmless warning, not an error.
- **No backend gateway (8082) runs here.** Visiting `/` calls `/api/auth/me`, fails, and redirects to the external Hydra auth server, so you cannot complete a real login or load real data. `502`/network errors for `/api/*` are expected. To exercise the login UI without a backend, open `http://localhost:5000/login?login_challenge=demo` — the `login_challenge` query param makes the login form render directly instead of redirecting.

### Lint / typecheck / build

- `bun run typecheck` passes clean across all apps/packages.
- `bun run lint` currently reports **pre-existing errors** in `apps/workflow/src/features/workflow/shared/admin-ui.tsx` (react-refresh/only-export-components) plus assorted warnings elsewhere. These are not environment issues; lint tooling itself works.
- `bun run build` builds remotes then shell (all apps exit 0). Packages under `packages/*` are consumed as source via `workspace:*` and have no build step.
