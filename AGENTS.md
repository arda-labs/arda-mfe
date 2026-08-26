# AGENTS.md — Arda MFE Agent & Developer Guide

Tài liệu hướng dẫn toàn diện dành cho các AI Agent (Antigravity, Cursor, Copilot) và Kỹ sư phát triển khi làm việc với Monorepo **Arda MFE**.

---

## 1. Tổng quan Kiến trúc Micro-Frontend (MFE Architecture)

Arda MFE sử dụng mô hình **Vite + Module Federation + Bun** gồm 1 Host Shell và 7 Remote Micro-frontends độc lập:

| App / Remote | Cổng Dev | Route Prefix | Chức năng chính |
| :--- | :---: | :--- | :--- |
| **`shell`** | `5000` | `/*` | Host container, xác thực, điều hướng layout, nạp dynamic remotes |
| **`iam`** | `5101` | `/admin/*` | Quản trị IAM: Users, Groups, Roles, Permissions, Audit |
| **`platform`** | `5102` | `/admin/*` | Master data: Organizations, Parameters, Lookups, Geo, Templates |
| **`finance`** | `5103` | `/finance/*` | Kế toán: Accounts, Transactions, Approvals, Trial balance |
| **`account`** | `5104` | `/my-account/*`, `/settings/*`, `/in/*` | Quản lý Profile, Security, Sessions, Devices, Appearance |
| **`hrm`** | `5105` | `/hrm/*` | Quản trị nhân sự: Positions, Job Titles, Org Units, Employees |
| **`workflow`** | `5106` | `/workflow/*` | Quy trình & BPMN: Case Types, SLA, Roles, Zeebe 8.5 Monitoring |
| **`crm`** | `5107` | `/customers/*`, `/workbench/*` | Quản lý khách hàng hội viên, bàn làm việc xử lý giao dịch |

---

## 2. Quy tắc Bắt buộc trong Module Federation (Strict Rules)

### 2.1. Đồng bộ Singleton trong `federation.shared.ts`
* Tất cả cấu hình chia sẻ thư viện dùng chung **phải khai báo tại `federation.shared.ts`** ở thư mục gốc.
* **Tuyệt đối không sửa riêng lẻ `shared` trong từng `apps/<remote>/vite.config.ts`**.
* Các thư viện bắt buộc là singleton: `react`, `react-dom`, `react-router-dom`, `@workspace/auth`, `@workspace/theme`, `@workspace/notifications`, `@workspace/i18n`, `react-toastify`.
* **`@workspace/ai` CHƯA nằm trong shared map** — hiện chỉ shell dùng. Khi một remote cần import nó: thêm `"@workspace/ai"` + `"@workspace/ai/"` vào `remoteSharedDeps` VÀ khai báo dependency trong package.json của **tất cả** apps (bỏ qua bước 2 sẽ gây lỗi resolve khi build remote, ví dụ `account`). Thiếu share khi nhiều bên dùng = 2 instance registry/renderer của AI.

### 2.2. Chuẩn hoá Remote Router với `createRemoteRoutes`
* Mọi remote đều export một file duy nhất [`src/Routes.tsx`](file:///d:/github/arda/arda-mfe/apps/platform/src/Routes.tsx) qua Module Federation `exposes: { "./Routes": "./src/Routes.tsx" }`.
* Sử dụng factory `createRemoteRoutes` từ `@workspace/ui/lib/lazy`:
  ```tsx
  import "@workspace/i18n/apps/platform"
  import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

  const OrgsPage = lazyWithPreload(() => import("@/features/platform/organizations/page"))
  const ParametersPage = lazyWithPreload(() => import("@/features/platform/parameters/page"))

  export default createRemoteRoutes({
    routes: [
      { prefix: "/admin/organizations", component: OrgsPage },
      { prefix: "/admin/parameters", component: ParametersPage },
    ],
    defaultComponent: OrgsPage,
  })
  ```
* Host Shell luôn bọc các Remote Routes bên trong `<RemoteErrorBoundary>` để cô lập sự cố khi remote gặp lỗi mạng.

---

## 3. Quy chuẩn Tổ chức Code & Cấu trúc Thư mục (Code Conventions)

```text
apps/<remote>/src/
├── features/<domain>/
│   ├── api.ts                     <-- API client riêng của domain
│   ├── <feature-name>/
│   │   ├── schema.ts              <-- Zod validation schemas & form default values
│   │   ├── page.tsx               <-- Main page (Target ≤ 300-400 lines)
│   │   └── components/            <-- Các Dialog, Drawer, Table views tách rời
│   │       ├── CreateDialog.tsx
│   │       ├── EditDialog.tsx
│   │       └── TableView.tsx
├── Routes.tsx                     <-- Remote entrypoint cho Module Federation
└── main.tsx                       <-- Standalone dev harness
```

### 3.1. Quy tắc phân rã file:
* **Không viết file nguyên khối (Monolithic Mega-file):** Mục tiêu `page.tsx` ≤ 400 dòng.
* **Tách Zod Schema ra `schema.ts`:** Không khai báo Zod schema, interface form values và default values trực tiếp trong file UI.
* **Tách Form / View Dialogs vào `components/`:** Mỗi dialog xử lý một nghiệp vụ riêng (Create, Edit, Roles, Audit, Sessions).

---

## 4. Hệ thống Đa ngôn ngữ (i18n)

* **Hook sử dụng:** Luôn dùng `useI18n()` từ `@workspace/i18n`. Không dùng `useTranslation()`.
* **Cơ chế nạp tĩnh (Bundled):** Mỗi remote import từ điển của mình tại đầu `Routes.tsx`: `import "@workspace/i18n/apps/<app>"`.
* **Quy ước key navigation:** Các menu cha có các menu con cấp dưới sử dụng quy ước `_self` (ví dụ: `nav.workbench` ➔ `navigation:workbench._self`). Hàm `translate()` đã được bọc an toàn để không bao giờ trả về raw object cho React render.

---

## 5. Lệnh Phát triển & Kiểm thử (Commands)

```bash
# Cài đặt dependencies (sử dụng bun 1.3.14+)
bun install

# Kiểm tra ranh giới package (Package boundaries & no circular deps)
bun run check:packages

# Kiểm tra TypeScript toàn bộ monorepo (17 workspaces)
bun run typecheck

# Kiểm tra ESLint
bun run lint

# Build production toàn bộ 8 apps
bun run build

# Build từng app cho Cloudflare Pages
bun run cf:build <app_name>     # ví dụ: bun run cf:build shell
```

> [!IMPORTANT]
> Khi thêm hoặc cập nhật dependencies, luôn chạy `bun install` và commit file `bun.lock`. CI/CD deploy trên Cloudflare sử dụng cờ `--frozen-lockfile`.

---

## 6. Môi trường Dev & Local Auth Simulation

Do hệ thống backend OAuth/Ory Kratos không có chế độ mock trong môi trường local sandbox:
1. Chạy Host Shell: `bun run --filter shell dev` (:5000). Shell reverse-proxy tất cả `/api/*` về `http://localhost:8082`.
2. Chạy Remote cần phát triển: `bun run --filter platform dev` (:5102).
3. Đảm bảo cổng `8082` trả về user info hợp lệ cho endpoint `GET /api/auth/me` (`roles: ["SUPER_ADMIN"]`, `permissions: ["superadmin"]`) để vượt qua `AuthGuard`.
