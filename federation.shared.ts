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
  // @workspace/ai CHƯA share: chỉ shell dùng. Khi một remote bắt đầu import nó,
  // phải thêm cả hai mục "@workspace/ai" + "@workspace/ai/" vào đây VÀ khai báo
  // dependency trong package.json của TẤT CẢ apps (remote không khai báo =
  // build lỗi resolve như account từng gặp). Thiếu share khi nhiều bên dùng =
  // 2 instance registry/renderer của AI.
  "@workspace/notifications": { singleton: true, requiredVersion: false },
  "@workspace/notifications/": { singleton: true, requiredVersion: false },
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
} as const

// Vendor lớn để shell pre-bundle 1 lần ở boot, không ở first navigation
// (giảm độ trễ lần đầu load một remote/page).
export const shellOptimizeInclude = ["react-toastify"]
