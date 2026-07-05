// Nguồn duy nhất cho Module Federation shared deps + port registry.
//
// Bắt buộc: object `remoteSharedDeps` phải khớp 1:1 giữa shell và MỌI remote.
// Lệch 1 mục = runtime có 2 instance singleton (auth store, toast, theme, query)
// → state lệch, đăng xuất không lan, toast mất, theme lệch dark/light.
// Thêm package dùng chung mới → thêm vào `remoteSharedDeps` Ở ĐÂY, không sửa
// từng apps/<remote>/vite.config.ts.
//
// why trailing "/": catch subpath imports (`@workspace/auth/store`,
// `@workspace/i18n/foo`). Khai báo cả tên gốc lẫn "/" để cover cả hai kiểu.

export const remoteSharedDeps = {
  react: { singleton: true },
  "react-dom": { singleton: true },
  "react-dom/client": { singleton: true },
  "react/jsx-runtime": { singleton: true },
  "react/jsx-dev-runtime": { singleton: true },
  "@tanstack/react-query": { singleton: true },
  nuqs: { singleton: true },
  "nuqs/adapters/react": { singleton: true },
  "@workspace/i18n": { singleton: true },
  "@workspace/i18n/": { singleton: true },
  "@workspace/theme": { singleton: true },
  "@workspace/auth": { singleton: true },
  "@workspace/auth/": { singleton: true },
  "@workspace/notifications": { singleton: true },
  "@workspace/notifications/": { singleton: true },
  // ponytail: react-toastify v11 không expose `toast` qua MF virtual share
  // (MISSING_EXPORT). Để vendor thường; singleton @workspace/notifications
  // đã đủ share toast store — nâng react-toastify MF share khi plugin hết bug.
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
export const shellOptimizeInclude = [
  "@tanstack/react-query",
  "nuqs",
  "nuqs/adapters/react",
  "react-toastify",
]