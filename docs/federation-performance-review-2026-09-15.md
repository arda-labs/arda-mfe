# Rà soát Module Federation và first-load performance

Ngày: 2026-09-15. Commit được rà soát: `4627852`.

## Kết luận

Kiến trúc hiện tại có nền tảng hợp lý: remote tải theo nhu cầu, singleton tập trung, page-level lazy loading, error boundary và asset hash có cache dài. Tuy nhiên, first navigation vẫn chịu chi phí lớn do dependency không cần thiết được import tĩnh, nhiều bước tải phụ thuộc nhau, preload chưa phủ đúng đường đi và loading UI bị che bởi Suspense bên trong.

**Ưu tiên tối ưu: tách ExcelJS khỏi initial page graph, sửa fallback/preload và giảm shell boot payload.** Chưa có cơ sở để kết luận cần thay Module Federation hoặc chuyển CDN.

## Phạm vi và phương pháp

- Đọc cấu hình shell và registry shared/ports; kiểm tra cả 13 remote bằng invariant và rà soát toàn bộ `src/Routes.tsx`.
- Đọc shell bootstrap/auth, navigation, preload, error recovery, query lifecycle, i18n và các dependency nặng.
- Chạy `bun run build`: cả 14 app build production và đóng gói Cloudflare thành công, gồm bước TypeScript build của từng app.
- Chạy `bun run check:federation`: pass, 13 remote, 429 source files. `git diff --check`: pass trước khi viết báo cáo.
- Phân tích static imports và dynamic imports của JS đầu ra bằng TypeScript AST; tính gzip bằng Node zlib. Số liệu dưới đây dùng **KiB = 1.024 bytes**, làm tròn.
- Chạy build thử nghiệm platform ở thư mục tạm: transform import ExcelJS thành dynamic import trong hàm xuất XLSX, không sửa source ứng dụng.
- Dùng React Router `matchRoutes` kiểm chứng route ownership; dùng React server rendering kiểm chứng lazy component sau rejected import.
- Kiểm tra HTTP GET/HEAD asset công khai trên `https://arda.io.vn`, bao gồm platform/workflow remote entry và một hashed platform asset.

**Giới hạn đo:** chưa ghi waterfall/CPU trace trong phiên browser đã đăng nhập; Chrome DevTools MCP chuyên dụng không có trong session. Vì vậy không gán số giây, LCP/INP hoặc p95 cho trải nghiệm người dùng. Build size và static dependency closure không đồng nghĩa với lượng transfer thực tế của một navigation: còn phụ thuộc cache, shared provider, dynamic dependencies, CSS, API và compression trên mạng.

Toolchain quan sát: Bun 1.3.14, Vite 8.1.1, `@module-federation/vite` 1.21.5.

## 1. Cao — ExcelJS nằm trong initial dependency graph của các trang bảng

Nguồn:

- `packages/list-page/src/list-table-toolbar.tsx:7`: import tĩnh `TableExportDialog`.
- `packages/list-page/src/table-export-dialog.tsx:41`: import helper export.
- `packages/list-page/src/table-export.ts:2`: `import ExcelJS from "exceljs"`.
- Ví dụ consumer: `apps/platform/src/features/organizations/page.tsx:50`, `apps/iam/src/features/users/page.tsx:13`.

Dialog chỉ render nội dung khi mở, nhưng điều này không trì hoãn việc tải module đã được import tĩnh. Người dùng chỉ xem bảng cũng tải và evaluate ExcelJS. Ngay cả trang dùng server export vẫn đi qua toolbar/dialog chung.

Build xác nhận chunk chứa ExcelJS trong **10 remote**: IAM, platform, finance, HRM, workflow, loan, MDM, deposit, capital, statistical. Các chunk này khoảng 1.024–1.232 KiB raw và 285–343 KiB gzip, còn chứa các module khác; tên như `textarea` hay `use-data-table` không phản ánh đầy đủ nội dung chunk.

### Thử nghiệm có kiểm soát trên platform

| Hạng mục | Hiện tại | Dynamic import ExcelJS |
|---|---:|---:|
| Chunk `list-table-toolbar-*`, raw | 1.155 KiB | 247 KiB |
| Chunk `list-table-toolbar-*`, gzip | 322 KiB | 73 KiB |
| Static dependency closure của page Organizations, raw | 1.758 KiB | 850 KiB |
| Static dependency closure của page Organizations, gzip | 509 KiB | 260 KiB |
| ExcelJS riêng, chỉ được yêu cầu khi export | Không có chunk riêng | 908 KiB raw / 250 KiB gzip |

Static closure của Organizations không còn chứa chunk ExcelJS sau thử nghiệm. Khoảng **249 KiB gzip được đưa ra khỏi đường tải page**, giảm gần 49% tổng gzip của closure này. Đây là giảm initial payload; tổng JS của app vẫn gần như giữ nguyên vì tính năng export vẫn tồn tại.

Khuyến nghị:

1. Dynamic import ExcelJS khi thực sự xuất XLSX; helper CSV/filename/column metadata không kéo ExcelJS.
2. Khi triển khai, đổi contract export sang async và cập nhật caller để await, xử lý lỗi và trạng thái exporting đúng. Bản build thử nghiệm chỉ xác minh bundling, chưa kiểm thử export UI.
3. Có thể lazy-load cả export dialog khi mở nếu muốn giảm thêm UI code.
4. Không đưa ExcelJS vào shell eager/shared chỉ để chuyển chi phí sang lúc boot.

## 2. Cao — Tải theo nhiều bước, preload chưa đến đúng page cuối

Nguồn: `apps/shell/src/App.tsx:155-199`, `apps/shell/src/lazy-remote.ts:17-44`, `apps/shell/src/remote-routes.ts:65-71`, `apps/workflow/src/Routes.tsx:14-30`, `apps/workflow/src/features/workflow/page.tsx:4-35`.

Khi mở deep link, shell phải hoàn tất session check trước khi render remote. Sau đó federation resolve remote entry/runtime/shared/exposes, tải Routes, rồi Routes mới yêu cầu page. Page mount mới khởi chạy query/effect dữ liệu.

Workflow thêm một tầng: preload chỉ tải `WorkflowAdminPage`, trong khi page này tiếp tục `React.lazy` case-types, process-configs, monitoring, dashboard... Preload thành công chưa có nghĩa leaf page đã sẵn sàng.

Production `remoteEntry.js` đã có modulepreload do plugin sinh ra cho một số runtime/exposes assets. Vì vậy không nên mô tả toàn bộ mạng là tuần tự hoặc cho rằng chưa có preload ở tầng bundler; phần thiếu rõ ràng nằm ở route/leaf/data readiness.

Preload hiện chỉ gọi từ sidebar (`SidebarNav.tsx:109-112`). Command palette chỉ `navigate` (`CommandPalette.tsx:91-94`); deep link, notification và navigation trong page không có cùng cơ chế intent preload. Pointer-down sát thời điểm click thường không có nhiều thời gian tải trước.

Khuyến nghị:

- Dùng cùng route descriptor để resolve render và preload; preload thẳng leaf page của workflow.
- Áp dụng preload theo intent cho command palette và link nghiệp vụ quan trọng; dedupe request, có giới hạn concurrency và tránh tải hàng loạt do rê chuột qua menu.
- Có thể tải trước **code của route đang được yêu cầu** song song với session check, nhưng data preload phải dựa trên session/tenant đã xác thực.
- Nếu thêm data prefetch, phải dùng chính query key và QueryClient sẽ render page; không prefetch vào một client tạm rồi bỏ.

## 3. Cao về UX — 12/13 remote có Suspense fallback rỗng

Nguồn: `packages/ui/src/lib/lazy.ts:86-93`; các `Routes.tsx` viết tay của finance, CRM, workflow, loan, MDM, deposit, statistical.

Shell có skeleton tại `App.tsx:39-60`, nhưng khi Routes đã tải xong, Suspense bên trong remote bắt pending page và render `null`. Kết quả có thể là skeleton xuất hiện rồi biến thành vùng nội dung trống cho đến khi page tải xong. Account là trường hợp không có fallback rỗng trực tiếp trong Routes.

Khuyến nghị dùng route-level skeleton thống nhất hoặc để pending page đi lên boundary phù hợp. Phân biệt loading code với loading dữ liệu. Thay fallback cải thiện phản hồi thị giác, không tự giảm transfer hay thời gian network.

## 4. Cao — Shell tải cả AI UI/runtime ngay lúc boot

Nguồn: `apps/shell/src/ShellLayout.tsx:17-22,296-344`, `apps/shell/src/App.tsx:35`, `packages/ai/src/components/provider.tsx:9-17,120-125`.

- Shell import tĩnh Olorin panel, workspace, provider và page AI.
- Khi AI enabled, `OlorinProvider` mount dù `aiView` đang `closed`.
- Provider gọi `useOlorinConversations(true)`, nên còn khởi tạo lấy danh sách hội thoại dù người dùng chưa mở AI.
- Auth pages và dashboard cũng nằm trong graph import tĩnh của App.

Build shell: main `index-*` khoảng **870 KiB raw / 238 KiB gzip**; static closure khoảng **1.783 KiB raw / 524 KiB gzip**. Main chunk có AI code. Không quy toàn bộ con số này cho AI vì chunk còn chứa shell/UI khác.

Khuyến nghị tách AI context registry nhẹ khỏi panel/workspace/runtime nặng; lazy-load AI UI và chỉ khởi tạo phần cần thiết khi sử dụng. Tách auth pages khỏi boot của workspace nếu graph cho thấy lợi ích. Giữ session/auth store cần thiết cho shell ở đường boot ổn định.

## 5. Cao — Route ownership và preload registry đã bị lệch

### Route IAM được shell chuyển sang platform

`apps/iam/src/Routes.tsx:56-57` khai báo:

- `/admin/resource-routes`
- `/admin/oauth-clients`

Nhưng `apps/shell/src/App.tsx` không có route IAM tương ứng; cả hai match `/admin/*` tại dòng 326, render PlatformRoutes. Factory của platform không biết hai prefix này và chọn Organizations mặc định.

Probe bằng `matchRoutes` xác nhận cả hai URL match `/admin/*`, trong khi `/admin/users` match `/admin/users/*`.

### Route platform không được preload

`apps/platform/src/Routes.tsx:100-103` có jobs, working-hours, notifications, menus; `apps/shell/src/remote-routes.ts:34-46` chưa có bốn prefix đó. `/admin/menus` đã xuất hiện ở static navigation.

Nguồn route đang bị lặp ở App, preload registry, navigation và remote resolver. Nhiều resolver còn lặp riêng logic render/preload bằng `startsWith`; factory không kiểm tra ranh giới segment và dùng default page cho đường dẫn không biết.

Khuyến nghị một nguồn route ownership cho shell render/preload; một nguồn leaf resolution ở remote; thêm kiểm tra route coverage, overlapping prefixes và unknown route. `check:federation` hiện chỉ kiểm tra presence của remote và policy shared, nên vẫn pass khi route cụ thể sai.

## 6. Cao về recovery — Nút Thử lại không reset rejected React.lazy

Nguồn: `apps/shell/src/lazy-remote.ts:33-41`, `apps/shell/src/App.tsx:100-106`; pattern tương tự trong `packages/ui/src/lib/lazy.ts:24-38`.

Loader reset `modulePromise = null` khi reject, nhưng React.lazy được tạo đúng một lần và giữ rejected result của chính nó. Reset state của Error Boundary không tạo lazy identity mới.

Probe: render lazyRemote với import giả lập thất bại, đợi rejection, render lại cùng component. Loader được gọi **1 lần**, lần render thứ hai vẫn thấy lỗi cũ. Việc reset closure promise chỉ giúp retry preload trước khi lazy component đã consume lỗi, không giải quyết rejected lazy sau render.

Khuyến nghị phân biệt retry lỗi mạng, lỗi evaluate và stale deploy; tái tạo lazy identity có kiểm soát khi retry, kết hợp xử lý cache/error của federation runtime. Đổi `key` của cùng lazy object không đủ. Reload có thể là đường phục hồi cho stale assets, cần tránh reload loop.

## 7. Trung bình — Shared policy đảm bảo identity nhưng vẫn có chi phí tải lặp

Nguồn: `federation.shared.ts:13-43,74-97` và generated remote assets.

- `loaded-first` đang được dùng nhất quán; đúng với mục tiêu chỉ tải remote cần dùng.
- Shared root/subpath tạo nhiều điểm resolve/materialize. Generated platform runtime có các nhóm shared phụ thuộc nhau; thay danh sách shared có thể đổi boot graph.
- `@workspace/ui`, list-page, query được bundle riêng. ExcelJS và UI/form/table code lặp lại ở các URL `/mfes/<app>/assets/...`; cache URL của một remote không tự phục vụ chunk của remote khác.
- Singleton chủ yếu đảm bảo dùng cùng runtime instance. Nó không có nghĩa mọi code liên quan chỉ được tải một lần: còn fallback provider, wrapper và cách bundler gom chunk.
- `requiredVersion: false` trên toàn registry giảm ràng buộc negotiation nhưng không bảo đảm shell cũ tương thích API của shared package mới. Cùng source registry trong monorepo không bảo đảm các release đang chạy cùng phiên bản.
- Registry đã ghi nhận incident boot React #130 khi thêm posting-flow vào shared. Đây là lý do cần integration harness trước khi đổi share graph diện rộng.

Khuyến nghị giữ singleton cho state/context cần identity chung; tối ưu heavy stateless imports trước. Đánh giá vendor deduplication bằng bundle graph/trace và kiểm thử shell cũ–remote mới. Chưa nên share toàn bộ UI hoặc chuyển sang `version-first` để chữa first-load: `version-first` có thể tải entry mọi remote khi khởi tạo.

`shellOptimizeInclude = ["react-toastify"]` tại `federation.shared.ts:64-66` chỉ cấu hình Vite dependency optimization **trong dev**. Nó không prewarm production remote và không sửa các chunk nặng trong build trên Cloudflare.

## 8. Trung bình — Query cache gắn với lần mount, thiếu identity scope chung

Nguồn: `packages/query/src/provider.tsx:51-55`, `packages/list-page/src/server-list.ts:71-75,152-157`, `packages/auth/src/store.ts:214-223`.

- QueryProvider tạo client bằng useState mỗi lần mount. Rời remote làm cây đó unmount; quay lại có client mới. `gcTime: 5 phút` không có nghĩa cache được dùng lại sau khi tạo client mới.
- Vì vậy cần phân biệt module đã warm với dữ liệu đã warm: lần quay lại có thể không tải JS nhưng vẫn đợi API.
- Tenant switch cập nhật auth user, không có reset QueryClient hoặc tenant key chung. Ví dụ users query key cố định tại `apps/iam/src/features/users/list-query.ts:13`, trong khi tenantId chỉ nằm trong queryFn (`page.tsx:223-236`). Đổi tenant mà giữ cùng route/filter không tạo query key mới, có thể tiếp tục hiện dữ liệu cache cũ.
- Dynamic menu chỉ fetch lúc mount (`use-dynamic-nav.ts:72-88`), còn command palette dùng static nav, nên navigation cũng không có cùng lifecycle/session source.

Khuyến nghị giữ cache per-remote nếu đó là chủ đích, nhưng lifecycle phải explicit: cache theo remote + session/tenant/org scope, cancel/clear khi identity đổi, không giữ previous-data qua tenant switch. Nếu muốn giữ client qua navigation thì phải hoàn thiện scope này trước. Dùng cùng effective menu cho sidebar và command palette.

## 9. Trung bình — Locale và BPMN còn các phần có thể tách thêm

- Mọi Routes import cả vi/en và đăng ký locale đồng bộ. `loadRemoteAppLocale` có export nhưng không thấy consumer trong app. App locales hiện là bundled, không phải đang lazy fetch theo locale đang dùng. Routes chunk của workflow khoảng 86 KiB raw; AI khoảng 61 KiB raw, bao gồm cả code/provider/locale chứ không chỉ JSON.
- Có thể tách theo feature/locale nếu measurement chứng minh cần thiết; phải giữ registration/fallback đúng trước khi render.
- BPMN đã có lazy wrapper, và dialog chỉ mount khi có `viewingDefinition` (`process-monitoring-page.tsx:289-300`): đây là điểm đang làm đúng.
- Tuy nhiên viewer/modeler vẫn import chung trong `bpmn-monitor.tsx:4-5`; mở viewer có thể tải cả modeler. Chunk này khoảng **594 KiB raw / 166 KiB gzip**. Tách read-only viewer và editor là tối ưu cho lần mở sơ đồ đầu tiên, không phải nguyên nhân của mọi trang workflow.
- Monitoring lấy ba API bằng Promise.all trước khi hoàn tất primary load (`process-monitoring-page.tsx:190-204`); độ trễ dữ liệu còn phụ thuộc request chậm nhất, ngoài phần federation.

## 10. Trung bình — Release/cache và observability chưa đủ để kiểm soát regression

### Asset headers quan sát thực tế

Ngày 2026-09-15, request từ môi trường audit qua Cloudflare HKG:

| URL | Status | Cache-Control |
|---|---|---|
| `/mfes/platform/remoteEntry.js` | 200 | `public, max-age=30, s-maxage=30, stale-while-revalidate=60` |
| `/mfes/workflow/remoteEntry.js` | 200 | Cùng policy entry ở trên |
| Hashed platform runtime asset được entry tham chiếu | 200 | `public, max-age=31536000, immutable` |
| `/` | 200 | `public, max-age=0, must-revalidate` |

Headers tương thích cấu hình Worker assets của repo. Không thấy proxy shell chuyển tiếp từng remote asset trong `cloudflare/shell-worker.ts`; mỗi remote được cấu hình route Worker riêng theo prefix. Header kiểm tra được chưa chứng minh mọi route triển khai giống hệt, cũng không xác định được contribution của CDN vào latency người dùng.

Pipeline `scripts/build-cloudflare-app.mjs:46-48` đóng gói lại output hiện tại; chưa thấy release pinning hoặc policy giữ chunk N−1 trong pipeline này. Rủi ro cần kiểm thử là tab cũ/entry cũ tham chiếu hash sau deploy. Không ghi nhận lỗi 404 này trong lần kiểm tra hiện tại.

### Gaps ở các gate

- `check-federation-compat.mjs` kiểm tra cấu trúc bằng text/regex, không test cold navigation, dependency duplication, rejected lazy recovery hoặc route ownership.
- Kiểm tra version hiện chỉ yêu cầu chuỗi không rỗng; không kiểm chứng immutable release URL/contract.
- `verify.yml` chạy typecheck và diff check; chưa có performance budget hoặc browser smoke test.
- `browser-telemetry.ts` dispatch event/callback cho lỗi; không tìm thấy production listener gửi report hoặc route-ready performance marks trong source đã quét. Không đủ số liệu để tách slow remote, slow page JS và slow API.

Khuyến nghị đo riêng: navigation intent, remote module ready, leaf page ready, critical data ready; gắn remote/build ID, route pattern, cache state và failed chunk URL. Thêm budget JS critical path và test route ownership/retry. Test tab cũ qua một lần deploy và một remote offline.

## Kiểm kê build toàn bộ deployment units

**Tổng dưới đây là tất cả JS emitted**, gồm mọi page, runtime và fallback provider; không dùng làm first-navigation transfer budget. Không gồm CSS/fonts.

| App | JS files | Tổng raw KiB | Tổng gzip KiB | Chunk chứa ExcelJS |
|---|---:|---:|---:|---|
| shell | 45 | 1.890 | 562 | Không |
| account | 53 | 1.286 | 407 | Không |
| ai | 51 | 1.242 | 391 | Không |
| capital | 45 | 2.262 | 671 | Có |
| crm | 46 | 1.275 | 402 | Không |
| deposit | 49 | 2.338 | 696 | Có |
| finance | 85 | 2.428 | 730 | Có |
| hrm | 47 | 2.356 | 699 | Có |
| iam | 60 | 2.385 | 711 | Có |
| loan | 86 | 2.463 | 736 | Có |
| mdm | 38 | 2.238 | 662 | Có |
| platform | 68 | 2.734 | 811 | Có |
| statistical | 52 | 2.310 | 689 | Có |
| workflow | 57 | 3.116 | 900 | Có |

## Thứ tự xử lý đề xuất

1. **Gói đầu:** dynamic ExcelJS + async export handling; loading fallback thống nhất; sửa route IAM thiếu và bốn platform preload prefixes; sửa recovery cho rejected lazy. Thêm test nhắm đúng các lỗi routing/recovery.
2. **Gói tiếp:** preload leaf workflow và intent navigation chung; giảm shell AI boot graph; đo code-ready/data-ready để kiểm chứng cải thiện trên các trang chậm thực tế.
3. **Ổn định kiến trúc:** route descriptors tập trung; tenant-scoped cache/menu lifecycle; contract/version compatibility; release retention/pinning và performance budgets.
4. **Tối ưu có số liệu:** shared vendor strategy, locale partitioning, BPMN viewer/editor split.

Tiêu chí nghiệm thu nên gồm cold deep link và first cross-remote navigation, hover/no-hover, quay lại remote, retry sau chunk lỗi, đổi tenant ở cùng route và tab cũ sau deploy. Profile ít nhất một trang list dùng Excel toolbar, một trang workflow và một trang nhẹ như account để có đối chứng.

## Nguồn đối chiếu chính thức

- [Module Federation shareStrategy](https://module-federation.io/configure/shareStrategy)
- [React lazy: Promise/result được cache](https://react.dev/reference/react/lazy)
- [Vite dependency pre-bundling chỉ áp dụng dev](https://vite.dev/guide/dep-pre-bundling)
- [Cloudflare Workers static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)

---

# Phần 2 — Triển khai đề xuất (cùng ngày 2026-09-15)

Phần này ghi lại thay đổi đã thực hiện theo đúng thứ tự xử lý ở trên, kèm cách kiểm chứng lại.
Không thay Module Federation, không đổi CDN, không đổi contract HTTP của BE.

## 1. Tách ExcelJS khỏi initial page graph

- `packages/list-page/src/table-export.ts`: `exportTableToXlsx` chuyển thành `async`, `await import("exceljs")` bên trong hàm; `workbook.xlsx.writeBuffer()` được `await` thay vì `.then()` rời rạc nên lỗi ném đúng vào caller.
- `packages/list-page/src/table-export-dialog.tsx`: hai call site dùng `await exportTableToXlsx(...)` nằm trong `try/catch/finally` sẵn có (giữ `setIsExporting`).
- `apps/iam/src/features/users/components/UsersBatchActions.tsx`: thêm state `exporting` + `await` + `notify.error(t("common.export.failed"))`, tránh bấm trùng khi chunk ExcelJS đang tải.
- `packages/list-page/src/list-table-toolbar.tsx`: `TableExportDialog` chỉ mount khi mở và được tải bằng `lazyWithPreload`; nút Export preload chunk khi hover/focus nên click đầu tiên không phải chờ mạng.
- Kết quả đo trên build thử nghiệm platform (phần 1): toolbar 322 → 73 KiB gzip, static closure của trang Organizations 509 → 260 KiB gzip, ExcelJS trở thành chunk riêng 250 KiB gzip chỉ tải khi bấm Export.

## 2. Một registry route ownership cho cả render và preload

- `federation.routes.ts` (root, cạnh `federation.shared.ts`) là nguồn duy nhất: prefix → remote + `resolveRemoteRoute`.
- `apps/shell/src/remote-routes.ts` sinh bảng `<Route>` của shell từ registry đó; `navigation-preload.ts` dùng cùng registry cho preload; `check-federation-compat.mjs` đọc chính file này để đối chiếu.
- Sửa hai lỗi ownership đã nêu ở phần 1: `/admin/resource-routes` và `/admin/oauth-clients` thuộc **iam**; `/admin/jobs`, `/admin/working-hours`, `/admin/notifications`, `/admin/menus` thuộc **platform** và không còn rơi vào default Organizations.
- `createRemoteRoutes`: chọn theo prefix dài nhất (có `exact` cho index dùng chung tiền tố), `defaultPrefixes` chỉ cho phép fallback trong namespace của remote; path ngoài namespace render 404 thay vì trang mặc định sai.
- `account` giữ router riêng (layout + `navigate` props) nhưng bổ sung fallback tương đương hành vi cũ: `/settings`, `/my-account` và sub-path không khớp vẫn ra tab profile; `/in/*`, `/settings/appearance` vẫn không layout.
- Preload theo ý định người dùng dùng chung một đường: `data-preload-href` + `pointerover/focusin` (debounce 150 ms, bỏ qua `saveData`/2g), `navigateTo()` phát `arda:navigation-intent`; sidebar, command palette, notification bell và browser notification đều đi qua đó. Deep link được preload ngay sau khi xác thực, không tải JS remote cho phiên chưa đăng nhập.
- Preload của remote đi tới leaf: workflow preload đúng page con theo `routeFromPath`, và `lazyWithPreload` gọi tiếp `preload(pathname)` của component con (trước đây dừng ở app-level).

## 3. Recovery, loading UI và shell boot payload

- `lazyWithPreload`: đăng ký retry qua registry `Symbol.for("arda.lazy-retries.v1")`; promise đã reject được reset và `React.lazy` identity được tạo lại, nên "Thử lại" thật sự tải lại thay vì replay lỗi cache.
- Shell `RemoteRoute`: error boundary có nút Thử lại (reset + retry) và Tải lại trang, tự retry khi đổi route; `Suspense` dùng skeleton `RouteLoading` thay `fallback: null`.
- Locale tách chunk theo ngôn ngữ (`createAppLocaleLoader`, dùng chung registry retry): chỉ tải `vi-VN` hoặc `en-US` đang dùng; lỗi chunk locale retry được.
- Shell boot: AI runtime (`@workspace/ai`) chỉ tải khi người dùng mở panel/workspace (`aiState.activated`), provider nhận `active` để không gọi conversations khi panel đóng, remount theo `authScope`; các trang auth (`LoginPage`, `CallbackPage`, …) thành lazy chunk. Workflow viewer/modeler tách khỏi trang monitoring (`bpmn-monitor-lazy`).
- Số đo `bun run check:bundles` sau thay đổi: **shell entry static graph 1.024 KiB raw / ≈320 KiB gzip**, AI page chỉ thêm **761 KiB raw / ≈208 KiB gzip** khi mở; mỗi remote boot ≈160 KiB gzip, page lớn nhất cộng thêm 54–121 KiB.
- Phân rã shell boot theo chunk (gzip, build 2026-09-15): `@workspace/auth` (+loading/oauth/store/api-bridge) 77 KiB, `react-router-dom` 64 KiB, `react-dom/client` 55 KiB, `@workspace/api` 51 KiB, shell entry + AI labels/registry 33 KiB, MF runtime + remote entry 25 KiB, `@workspace/notifications` 6 KiB, còn lại <2 KiB. Tức phần lớn boot là singleton bắt buộc của MF host, không còn dependency feature nào.

| Hạng mục | Trước | Sau |
|---|---|---|
| Shell entry static graph (raw) | 1.783 KiB | 1.024 KiB |
| Shell entry static graph (gzip) | 524 KiB | ≈320 KiB |
| AI runtime | trong graph boot | lazy sau khi mở panel/workspace |
| ExcelJS | static trong 10 remote | dynamic chunk, chỉ tải khi export |
| Export dialog | static trong mỗi toolbar | lazy + preload khi hover |
| Locale remote | tất cả tải cùng app | 1 chunk theo ngôn ngữ đang dùng |
| Fallback route | default page (sai) cho path lạ | 404 rõ ràng, default chỉ trong namespace |
| Lazy chunk lỗi | không phục hồi được | retry thật qua registry + UI Thử lại |

## 4. Cache theo phiên thay vì theo mount

- `getAuthScope()` trong `@workspace/auth/store` = `sub + activeTenantId + activeOrgId + authVersion`.
- `@workspace/query/provider`: giữ một `QueryClient` theo scope cho mỗi remote (điều hướng đi–về không mất cache) nhưng xoá cache và cancel query khi scope đổi (đổi tenant/org, logout); `QueryProvider` remount theo scope.
- Dedupe in-flight GET thêm session scope vào key (`packages/api/src/client.ts`), nên response của tenant cũ không thể bị ghép cho tenant mới.
- Shell remount `Outlet` theo scope để UI không giữ state của tenant trước.

## 5. Contract, release retention, telemetry và gate

- `packages/ui/src/lib/federation-contract.ts`: `routesContract = { version, buildId }`; build id lấy từ `VITE_MFE_BUILD_ID` do pipeline sinh. Shell từ chối remote sai version trước khi render; remote cũ chưa có metadata vẫn tải được (rolling release).
- Pipeline `build-cloudflare-app.mjs` + `scripts/asset-release.mjs`: mỗi app phát hành `mfe-release.json` (version, contractVersion, buildId, danh sách asset kèm sha256/size, previousBuildId) và **giữ chunk N−1** (chỉ `assets/*` + `remoteEntry-<hash>.js`, xác minh sha256, trần 30 MiB, không giữ `remoteEntry.js`/HTML). Nguồn manifest N−1: `MFE_PREVIOUS_ORIGIN` (mặc định `https://arda.io.vn` trong CI, đặt `off` để tắt); local dùng lại output lần trước. Lỗi mạng/sai hash chỉ cảnh báo, không làm fail deploy. `_headers` thêm `no-store` cho `mfe-release.json`.
- Telemetry đã có listener production: `apps/shell/src/browser-telemetry.ts` giữ ring buffer 100 sample trong `sessionStorage`, phát lỗi remote/asset và các mốc `remote-ready` / `page-ready` / `data-ready`; nếu đặt `VITE_BROWSER_TELEMETRY_URL` thì batch POST (cookie-backed) mỗi 10 s và khi `pagehide`.
- Gate mới: `check:bundles` (budget 400 KiB gzip cho boot và cho phần page cộng thêm; chặn ExcelJS trên static path và AI trên boot path), `test:federation` (10 test: retry, dedupe, thứ tự prefix, ownership, contract, locale loader, cache scope, dedupe scope, retention), `test:browser` (4 spec Playwright chạy trên asset đã đóng gói: deep link IAM, IAM giữ `/admin/resource-routes`, platform `/admin/organizations`, 404 cho path lạ), `check:federation` mở rộng (coverage prefix ↔ route/fallback, fallback phải thuộc đúng remote, cấm `fallback={null}`), và CI `verify.yml` thêm job `federation-runtime` (build + budget + browser).

## 6. Cách kiểm chứng

```bash
cd arda-mfe
bun install
bun run typecheck        # i18n, packages, credentials, fallbacks, federation, pages + tsc toàn bộ
bun run test:federation  # 10 test invariant runtime (không cần browser)
bun run build            # build + đóng gói 14 app, sinh mfe-release.json và giữ chunk N-1
bun run check:bundles    # budget boot/page + cấm ExcelJS/AI trên static path
bun run test:browser     # 4 spec Playwright trên asset đã đóng gói (Chromium)
```

Kết quả lần chạy 2026-09-15: `typecheck` pass toàn bộ (13 remote, 432 source được kiểm shared-dep);
`test:federation` 10/10 pass; `check:bundles` pass (shell boot ≈320 KiB gzip, AI page +≈208 KiB, remote boot ≈160 KiB, page +54…121 KiB);
`test:browser` 4/4 pass (IAM deep link, IAM giữ `/admin/resource-routes`, platform `/admin/organizations`, shell 404);
`check:federation` pass; `git diff --check` pass. Giữ chunk N−1 đã kiểm chứng trên rebuild thật: 4 asset của bản trước vẫn còn trong output dù không còn trong manifest mới.

## 7. Chưa làm / giới hạn

- Chưa có trace browser đã đăng nhập trên production, nên vẫn **không quy đổi** KiB thành giây hay LCP/INP. Muốn định lượng phải so sánh cold deep link, first cross-remote navigation và warm revisit bằng telemetry mới hoặc DevTools trace.
- AI workspace vẫn là page nặng nhất (≈208 KiB gzip cộng thêm khi mở) vì đó là bản thân feature; nếu cần nhẹ hơn thì bước tiếp theo là tách markdown/highlight trong `@workspace/ai`.
- Viewer và modeler BPMN vẫn nằm chung một chunk; đã lazy nhưng chưa tách đôi theo nhu cầu xem/sửa.
- Không đổi Module Federation, không chuyển CDN, không đổi cách share `@workspace/*` — các số đo chưa chứng minh cần thiết.

## 8. Vận hành sau deploy

- Retention N−1 là best-effort: nếu build log có `⚠️ … skipping N-1 retention`, tab đang mở ở bản cũ có thể 404 chunk; kiểm tra `mfe-release.json` và mạng từ CI tới `arda.io.vn`.
- Đặt `MFE_PREVIOUS_ORIGIN=off` khi build offline; đặt URL khác khi build từ môi trường không phải production.
- Bật collector bằng `VITE_BROWSER_TELEMETRY_URL`; không đặt thì chỉ ghi `sessionStorage` (`arda:telemetry`) và measure trên Performance Timeline (`arda:remote-ready`, `arda:page-ready`, `arda:data-ready`).
- Sau mỗi lần deploy nên mở lại tab cũ và một deep link lạnh để kiểm chứng retention và route ownership.

