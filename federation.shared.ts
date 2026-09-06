// Nguồn duy nhất cho Module Federation shared deps + port registry.
//
// Bắt buộc: object `remoteSharedDeps` phải khớp 1:1 giữa shell và MỌI remote.
// Lệch 1 mục = runtime có 2 instance singleton (auth store, toast, theme, query)
// → state lệch, đăng xuất không lan, toast mất, theme lệch dark/light.
// Thêm package dùng chung mới → thêm vào `remoteSharedDeps` Ở ĐÂY, không sửa
// từng apps/<remote>/vite.config.ts.
//
// why trailing "/": catch shared subpath imports such as `@workspace/auth/store`.
// i18n app resource subpaths are intentionally NOT shared: each remote bundles
// only its own locale JSON, then registers it into the shared i18n singleton.

export const remoteSharedDeps = {
  react: { singleton: true, requiredVersion: false },
  "react-dom": { singleton: true, requiredVersion: false },
  "react-dom/client": { singleton: true, requiredVersion: false },
  "react/jsx-runtime": { singleton: true, requiredVersion: false },
  "react/jsx-dev-runtime": { singleton: true, requiredVersion: false },
  "react-router-dom": { singleton: true, requiredVersion: false },
  "@workspace/i18n": { singleton: true, requiredVersion: false },
  "@workspace/api": { singleton: true, requiredVersion: false },
  "@workspace/api/": { singleton: true, requiredVersion: false },
  "@workspace/theme": { singleton: true, requiredVersion: false },
  "@workspace/theme/": { singleton: true, requiredVersion: false },
  "@workspace/auth": { singleton: true, requiredVersion: false },
  "@workspace/auth/": { singleton: true, requiredVersion: false },
  // AI panel is currently shell-only; enforcement of that decision lives in
  // sharedWorkspaceExemptions below + check:federation (automated).
  "@workspace/notifications": { singleton: true, requiredVersion: false },
  "@workspace/notifications/": { singleton: true, requiredVersion: false },
  // Pure formatting helpers (money/percent/date) — no state, singleton harmless:
  // mọi remote hiển thị tiền phải đi qua đây thay vì Intl inline.
  "@workspace/format": { singleton: true, requiredVersion: false },
  "@workspace/format/": { singleton: true, requiredVersion: false },
  // Bắt buộc singleton: notify.* gọi `toast` từ react-toastify; shell render
  // ToastContainer từ cùng instance — thiếu share = toast remote không hiện UI shell.
  "react-toastify": { singleton: true, requiredVersion: false },
} as const

// Port cố định từng remote. app shell hardcode entry URL theo các port này,
// nên strictPort:true ở mỗi vite remote để không rơi về port khác rồi shell
// timeout/rettry → cảm giác "load lần đầu rất lâu".
export const remotePorts = {
  iam: 5101,
  platform: 5102,
  finance: 5103,
  account: 5104,
  hrm: 5105,
  workflow: 5106,
  crm: 5107,
  ai: 5108,
  loan: 5109,
  mdm: 5110,
} as const

// Vendor lớn để shell pre-bundle 1 lần ở boot, không ở first navigation
// (giảm độ trễ lần đầu load một remote/page).
export const shellOptimizeInclude = ["react-toastify"]

/**
 * Workspace packages deliberately NOT registered as Module Federation
 * singletons. Every key must carry a non-empty justification — check:federation
 * fails otherwise and also fails when an unshared workspace package is imported
 * by two or more deployment units without being exempted here.
 *
 * Policy:
 * - Singleton packages own their global stores (auth/session, notifications,
 *   i18n registry): react-query/zustand copies bundled inside them are fine.
 * - Per-remote caches are intentional: each remote keeps its own TanStack
 *   QueryClient via QueryProvider in src/Routes.tsx; sharing would couple
 *   invalidation timing across independently released units.
 */
export const sharedWorkspaceExemptions = {
  "@workspace/ui": "presentational-only; no cross-tree state",
  "@workspace/admin-list": "per-remote list isolation",
  "@workspace/query": "per-remote cache isolation",
  "@workspace/media": "stateless protocol helpers",
  // When a second remote needs the panel: move "@workspace/ai" out of this map
  // into remoteSharedDeps AND declare it in every app's package.json.
  "@workspace/ai": "shell-only until CRM tool-renderer integration lands",
} as const
