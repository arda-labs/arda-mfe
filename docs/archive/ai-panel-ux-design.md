# Olorin AI Panel — UI/UX Design & Frontend Standards

> **Note:** This file is archived as historical design reference. Parts of it
> are now implemented (e.g. `RunStatusBanner`, `RunErrorCard`, meta-tool UIs
> in `packages/ai/src/components/`); the remaining sections are still useful
> as roadmap reference. See `docs/ai-integration-guide.md` for the current
> integration surface.

Status: **Design specification — pre-implementation**. Covers the Olorin
assistant panel (`packages/ai`) interaction patterns, animation system, error
code standardization, retry UX, and tool result rendering standards required
before Code Mode (2 Meta-Tools) ships to users.

---

## 1. Phân tầng trạng thái Chạy ngầm (Progressive Run Status)

### Vấn đề hiện tại

Khi model đang chạy, UI chỉ có nút ■ Stop và im lặng hoàn toàn. Với Code Mode,
một run có thể trải qua nhiều bước khác nhau (LLM reasoning → `search` → `execute`
→ nhiều domain calls → final response) kéo dài 5–15 giây. User không có phản
hồi nào từ hệ thống trong suốt thời gian đó.

### Thiết kế: Thinking Indicator phân tầng

Bổ sung một `RunStatusBanner` hiển thị ngay dưới avatar Olorin trong lúc run
đang hoạt động. Banner cập nhật state theo các SSE events nhận được.

```
Phase: THINKING
  ✦ · · ·  Olorin đang phân tích yêu cầu...

Phase: SEARCHING (khi nhận TOOL_CALL_START cho "search")
  ✦ · · ·  Đang khám phá các API liên quan...

Phase: EXECUTING (khi nhận TOOL_CALL_START cho "execute")
  ✦ · · ·  Đang truy vấn dữ liệu — CRM • Finance

Phase: RESPONDING (khi nhận TEXT_MESSAGE_START)
  ✦ · · ·  Đang soạn câu trả lời...
```

**State machine của RunStatusBanner:**

```
IDLE
  │ RUN_STARTED
  ▼
THINKING ──► TOOL_CALL_START(search) ──► SEARCHING
                                              │ TOOL_CALL_RESULT
                                              ▼
                                         THINKING ──► TOOL_CALL_START(execute) ──► EXECUTING
                                                                                        │ TOOL_CALL_RESULT
                                                                                        ▼
                                                                                   THINKING ──► TEXT_MESSAGE_START ──► RESPONDING
                                                                                                                            │ RUN_FINISHED
                                                                                                                            ▼
                                                                                                                          IDLE
```

**Implementation note:** State machine chạy trong `adapter.ts` bên cạnh phần
parse SSE events. Expose state qua một React context nhỏ hoặc Zustand atom để
`RunStatusBanner` subscribe mà không re-render cả message list.

**Domain label trong EXECUTING phase:** Khi `execute` tool đang chạy, banner
có thể hiển thị domain đang được truy vấn nếu backend emit một event metadata
nhỏ (hoặc suy luận từ script content nếu có). Không bắt buộc trong phiên bản
đầu — hiển thị "Đang xử lý..." là đủ.

---

## 2. Chuẩn hóa Error Code — Backend → Frontend

### Vấn đề hiện tại

[`adapter.ts`](../../packages/ai/src/adapter.ts) dòng 138–139:
```ts
if (event.error) {
  throw new Error(event.error)   // raw string, không phân loại
}
```

Backend `ai-service` emit các error code có cấu trúc (`ai.*`), nhưng frontend
vứt hết vào một `Error` generic và hiển thị raw code string cho user.

### Bảng Error Code chuẩn hóa

Tạo `src/errors.ts` trong `packages/ai`:

```ts
export type AiErrorCode =
  | "ai.model_unavailable"
  | "ai.tool_forbidden"
  | "ai.tool_not_found"
  | "ai.tool_invalid"
  | "ai.agent_step_limit"
  | "ai.run_replay"
  | "ai.persistence_unavailable"
  | "ai.sandbox_quota_exceeded"
  | "ai.sandbox_script_rejected"
  | "ai.approval_unavailable"
  | "ai.approval_persistence_unavailable"
  | "ai.invalid_copilotkit_envelope"

export type AiErrorSeverity = "transient" | "user" | "system"

export type AiErrorMeta = {
  /** Message hiển thị cho user — phải qua i18n key */
  i18nKey: string
  /** Có thể retry tự động không */
  retryable: boolean
  /** Loại lỗi — ảnh hưởng đến cách render */
  severity: AiErrorSeverity
  /** Hành động gợi ý cho user */
  action?: "retry" | "rephrase" | "contact_admin" | "split_query"
}

export const AI_ERROR_MAP: Record<string, AiErrorMeta> = {
  "ai.model_unavailable": {
    i18nKey: "ai.error.model_unavailable",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.tool_forbidden": {
    i18nKey: "ai.error.tool_forbidden",
    retryable: false,
    severity: "user",
    action: "contact_admin",
  },
  "ai.tool_not_found": {
    i18nKey: "ai.error.tool_not_found",
    retryable: false,
    severity: "system",
  },
  "ai.tool_invalid": {
    i18nKey: "ai.error.tool_invalid",
    retryable: true,
    severity: "user",
    action: "rephrase",
  },
  "ai.agent_step_limit": {
    i18nKey: "ai.error.step_limit",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.run_replay": {
    i18nKey: "ai.error.run_replay",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.persistence_unavailable": {
    i18nKey: "ai.error.persistence_unavailable",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.sandbox_quota_exceeded": {
    i18nKey: "ai.error.sandbox_quota",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.sandbox_script_rejected": {
    i18nKey: "ai.error.sandbox_rejected",
    retryable: false,
    severity: "system",
  },
}

export function resolveAiError(code: string): AiErrorMeta {
  return AI_ERROR_MAP[code] ?? {
    i18nKey: "ai.error.unknown",
    retryable: true,
    severity: "transient",
    action: "retry",
  }
}
```

### Error Message Component

Thay thế việc throw raw Error, render một `RunErrorCard` ngay sau message cuối
trong thread khi `RUN_FINISHED` có `error`:

```
┌──────────────────────────────────────────────┐
│  ⚠  Yêu cầu quá phức tạp để xử lý trong     │  ← ai.agent_step_limit
│     một lần. Hãy chia nhỏ câu hỏi thành      │
│     nhiều phần riêng biệt.                   │
│                                              │
│  [Hỏi lại]  [Tạo thread mới]                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  ↻  Trợ lý tạm thời không khả dụng.          │  ← ai.model_unavailable
│     Vui lòng thử lại sau giây lát.           │
│                                              │
│  [Thử lại]                                   │
└──────────────────────────────────────────────┘
```

---

## 3. Retry UX

### Hiện tại

`ActionBarPrimitive.Reload` tồn tại nhưng ẩn (`opacity-0`) và chỉ hiện khi
hover vào message. Không có logic phân biệt "retry vì lỗi" vs "regenerate vì
không hài lòng".

### Thiết kế

**Rule:** Nút Retry luôn visible (không cần hover) nếu message cuối cùng của
assistant là error state.

```tsx
// Trong AssistantMessage, thêm điều kiện:
<MessagePrimitive.If last assistant>
  <RunErrorCard />   {/* Render error card + retry button bên ngoài bubble */}
</MessagePrimitive.If>
```

**Retry behavior theo error type:**

| Error | Nút hiển thị | Action |
|:---|:---|:---|
| `transient` (model down, persistence) | "Thử lại" | `ActionBarPrimitive.Reload` |
| `user` + `action: "rephrase"` | "Sửa câu hỏi" | Focus vào Composer |
| `user` + `action: "split_query"` | "Chia nhỏ yêu cầu" | Focus Composer + hint text |
| `user` + `action: "contact_admin"` | "Liên hệ quản trị" | Link đến support |
| `system` | "Thử lại" (disabled nếu không retryable) | — |

**Auto-retry:** Không bao giờ auto-retry. User luôn phải chủ động bấm.

---

## 4. Tool Result Cards — Chuẩn hóa Renderer

### Nguyên tắc

1. **Không hiển thị raw JSON** cho end user trừ khi đang ở Developer Mode.
2. Mỗi tool/domain có card renderer riêng, đăng ký qua `registerToolRenderer`.
3. `GenericToolView` chỉ là fallback — cần được cải thiện thành `DataTableView`
   cho array results thay vì raw JSON dump.
4. Tool card có **2 state**: `pending` (đang chạy) và `resolved` (xong).

### Card specs cho 2 Meta-Tools

#### `search` Tool Card

```
┌─────────────────────────────────────────────┐
│ 🔍  Khám phá API                            │  ← pending state: animated
│     Đang tìm kiếm "crm customer risk"...    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🔍  Khám phá API  ·  3 phương thức tìm thấy │  ← resolved state
│     arda.crm • arda.finance                 │  ← domain chips
└─────────────────────────────────────────────┘
```

Khi hover/expand: Hiển thị danh sách method signatures (collapsible) để developer
hoặc power user có thể kiểm tra AI đang dùng API nào.

#### `execute` Tool Card

```
┌─────────────────────────────────────────────┐
│ ⚡  Đang xử lý...                           │  ← pending: animated dots
│     arda.crm.searchCustomers ●              │  ← step indicator
│     arda.finance.listInvoices ○             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚡  Hoàn thành · 1.2s  ✓                    │  ← resolved, success
│     3 phương thức · 12 bản ghi             │  ← compact stats
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚡  Lỗi xử lý  ✗                           │  ← resolved, error
│     sandbox_quota_exceeded · 3.0s          │
│     [Đơn giản hóa yêu cầu]                 │
└─────────────────────────────────────────────┘
```

**Note:** Để hiển thị step indicator trong `execute`, backend cần emit
`TOOL_CALL_ARGS` event chứa danh sách method names (không phải code source).
Đây là một thay đổi nhỏ ở `ai-service` khi implement Code Mode.

#### Generic Array Result — `DataTableView`

Khi `execute` trả về một JSON array, thay vì dump raw JSON:

```
┌─────────────────────────────────────────────────────┐
│ Kết quả — 5 bản ghi                                 │
├────────────────┬──────────────┬──────────────────────┤
│ Tên            │ Phân khúc    │ Hạng rủi ro          │
├────────────────┼──────────────┼──────────────────────┤
│ Công ty A      │ Enterprise   │ Cao                  │
│ Công ty B      │ SMB          │ Trung bình           │
│ ...            │              │                      │
└────────────────┴──────────────┴──────────────────────┘
  [Xem thêm ↓]
```

Dùng `Object.keys(array[0])` để tự suy ra columns. Giới hạn 5 rows hiển thị
mặc định, "Xem thêm" để expand.

---

## 5. Animation System

### Nguyên tắc Motion

- **Purposeful:** Animation chỉ tồn tại khi nó truyền đạt thông tin (đang chạy,
  đã xong, lỗi, mới xuất hiện). Không animate vì aesthetic đơn thuần.
- **Subtle & Fast:** Duration 150–300ms. Không dùng animation > 500ms trong UI
  nghiệp vụ.
- **Accessible:** Tôn trọng `prefers-reduced-motion`. Wrap toàn bộ animation
  trong `motion-safe:` Tailwind variant.

### Animation Catalog

#### Olorin Avatar — Running State
```css
/* Avatar bubble khi run đang chạy */
.olorin-avatar-running {
  @apply motion-safe:animate-pulse ring-2 ring-primary/40;
}
```

#### Message Entry Animation
```tsx
// Áp dụng cho mỗi message mới xuất hiện
<MessagePrimitive.Root
  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
>
```

#### Tool Card Entry
```tsx
// Tool cards xuất hiện sau khi có kết quả
<div className="motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in-0 motion-safe:duration-150">
```

#### Streaming Text Cursor
```tsx
// Blinking cursor ở cuối text đang stream
function StreamingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3.5 w-0.5 rounded-full bg-foreground/70
                 motion-safe:animate-[blink_1s_step-end_infinite]"
    />
  )
}
// CSS: @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
```

#### RunStatusBanner Thinking Dots
```tsx
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="Đang xử lý">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1 rounded-full bg-primary/60
                     motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}
```

#### Approval Countdown Ring
Dùng SVG `stroke-dashoffset` animation để hiển thị countdown đến `expiresAt`:
```tsx
// Tính remaining ratio từ (expiresAt - now) / (expiresAt - createdAt)
// SVG circle với stroke-dasharray=circumference, stroke-dashoffset=remaining*circumference
```
Color: `stroke-amber-500` → `stroke-red-500` khi < 2 phút còn lại.

---

## 6. User Avatar — Context-Aware

### Hiện tại
```tsx
<div className="...">U</div>   // Hardcoded chữ U
```

### Thiết kế
```tsx
function UserAvatar() {
  const context = collectOlorinContext()
  const initials = getInitials(
    context.userDisplayName as string | undefined
  ) ?? "U"
  return (
    <div className="flex size-7 items-center justify-center rounded-full
                    bg-primary text-primary-foreground text-xs font-semibold shadow-2xs"
         title={context.userDisplayName as string | undefined}
    >
      {initials}
    </div>
  )
}

function getInitials(name?: string): string | undefined {
  if (!name?.trim()) return undefined
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
```

Domain code (CRM, HRM, etc.) có thể contribute `userDisplayName` vào
`OlorinContext` qua `registerOlorinContext`.

---

## 7. Approval Card — UX Improvements

### Thiết kế bổ sung

#### Countdown timer

Thêm countdown ring và label động vào `ApprovalCard`:

```tsx
function ApprovalCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(getRemainingSeconds(expiresAt))

  useEffect(() => {
    const timer = setInterval(() => {
      const r = getRemainingSeconds(expiresAt)
      setRemaining(r)
      if (r <= 0) clearInterval(timer)
    }, 10_000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const isUrgent = remaining < 120  // < 2 phút
  return (
    <p className={cn("text-xs", isUrgent ? "text-destructive font-medium" : "text-muted-foreground")}>
      {remaining <= 0
        ? t("ai.approval.expired")
        : t("ai.approval.expires_in", { minutes: Math.ceil(remaining / 60) })
      }
    </p>
  )
}
```

#### Expired state

Khi `expiresAt` đã qua, ApprovalCard hiển thị "Đề xuất đã hết hạn" và vô hiệu
hóa hoàn toàn các nút thay vì để user bấm rồi nhận lỗi.

---

## 8. i18n Keys cần bổ sung

Tất cả string mới phải qua i18n, không hardcode. Bổ sung vào namespace `ai`:

```ts
// Error messages
"ai.error.model_unavailable"
"ai.error.tool_forbidden"
"ai.error.tool_invalid"
"ai.error.step_limit"
"ai.error.run_replay"
"ai.error.persistence_unavailable"
"ai.error.sandbox_quota"
"ai.error.sandbox_rejected"
"ai.error.unknown"

// Run status
"ai.status.thinking"
"ai.status.searching"
"ai.status.executing"
"ai.status.responding"

// Tool cards
"ai.tool.search.pending"
"ai.tool.search.resolved"      // {count} phương thức tìm thấy
"ai.tool.execute.pending"
"ai.tool.execute.resolved"     // {methods} phương thức · {rows} bản ghi
"ai.tool.execute.error"

// Retry actions
"ai.action.retry"
"ai.action.rephrase"
"ai.action.split_query"
"ai.action.contact_admin"

// Approval countdown
"ai.approval.expires_in"       // Còn {minutes} phút
"ai.approval.expired"

// Stop button (hiện đang hardcode)
"ai.composer.stop"

// Rate limiting
"ai.error.rate_limited"        // Quá nhiều yêu cầu, thử lại sau {seconds} giây
"ai.error.budget_exceeded"     // Tài khoản đã đạt giới hạn tháng này
"ai.composer.rate_limit_countdown"  // Thử lại sau {seconds}s
```

---

## 10. Rate Limiting UX

### Vấn đề

Backend có `AI_RATE_LIMIT_PER_MINUTE` middleware trả về HTTP 429, nhưng
`adapter.ts` hiện chỉ throw một Error generic với text `"HTTP 429"`. User không
biết phải làm gì.

### Error Code

Bổ sung vào `AI_ERROR_MAP` trong `src/errors.ts`:
```ts
"ai.rate_limited": {
  i18nKey: "ai.error.rate_limited",
  retryable: true,
  severity: "transient",
  action: "retry",
  // Đặc biệt: kèm theo countdown từ Retry-After header
},
"ai.budget_exceeded": {
  i18nKey: "ai.error.budget_exceeded",
  retryable: false,
  severity: "user",
  action: "contact_admin",
},
```

### Composer Throttle

Rate limit UX bắt đầu ngay tại Composer — ngăn user spam gửi nhiều lần liên
tiếp trước khi backend từ chối:

```tsx
// Trong Composer: debounce 800ms giữa các lần submit
// Visual: nút Send disabled trong 800ms sau lần submit trước

// Khi nhận 429 từ backend, parse Retry-After header (giây)
// Hiện countdown trong Composer thay vì nút Send:

if (rateLimitedUntil) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <ClockIcon className="size-3.5" />
      <span>{t("ai.composer.rate_limit_countdown", { seconds: remaining })}</span>
    </div>
  )
}
```

**Countdown logic:** Cập nhật mỗi giây qua `setInterval`. Khi countdown về 0,
Composer tự động unlock lại.

---

## 11. Accessibility

### Nguyên tắc

1. **Keyboard navigable:** Toàn bộ panel phải vận hành được hoàn toàn bằng
   bàn phím (Tab, Enter, Escape, Space, Arrow keys).
2. **Screen reader friendly:** Các trạng thái động (đang chạy, lỗi, approval)
   phải được thông báo qua ARIA live regions.
3. **No motion dependency:** Thông tin không được phụ thuộc vào animation —
   animation chỉ là visual reinforcement, không phải primary communication.
4. **Sufficient contrast:** Tất cả text phải đạt WCAG AA (4.5:1 cho text
   thường, 3:1 cho large text).

### ARIA Requirements

#### Panel Container

```tsx
<div
  role="region"
  aria-label={t("ai.panel.aria_label")}  // "Olorin AI Assistant"
>
```

#### Streaming / Running State

```tsx
// Live region thông báo khi run bắt đầu và kết thúc
<div
  aria-live="polite"
  aria-atomic="false"
  className="sr-only"
>
  {isRunning ? t("ai.aria.run_started") : t("ai.aria.run_finished")}
</div>
```

#### Thinking Indicator

```tsx
<div
  role="status"
  aria-label={statusLabel}  // "Olorin đang tìm kiếm API..."
  aria-live="polite"
>
  <ThinkingDots aria-hidden="true" />
  <span className="sr-only">{statusLabel}</span>
</div>
```

#### Tool Cards

```tsx
// Tool card announce khi xuất hiện
<div
  role="status"
  aria-label={t("ai.tool.search.resolved", { count: 3 })}
  aria-live="polite"
>
```

#### Approval Card

```tsx
<section
  aria-labelledby="approval-title"
  aria-describedby="approval-description approval-expiry"
>
  <h3 id="approval-title">{t("ai.approval.title")}</h3>
  <p id="approval-description">{t("ai.approval.description")}</p>
  <p id="approval-expiry">...</p>

  <button
    aria-label={t("ai.approval.approve_aria")}  // "Xác nhận thực hiện: Export 120 khách hàng"
    onClick={...}
  >
    {t("ai.approval.approve")}
  </button>
</section>
```

#### Error State

```tsx
<div role="alert" aria-live="assertive">
  <RunErrorCard error={error} />
</div>
```

`role="alert"` + `aria-live="assertive"` đảm bảo screen reader đọc ngay lập
tức khi lỗi xuất hiện.

#### Composer

```tsx
<ComposerPrimitive.Input
  aria-label={t("ai.composer.input_aria")}  // "Nhập câu hỏi cho Olorin"
  aria-describedby="composer-hint"
/>
<span id="composer-hint" className="sr-only">
  {t("ai.composer.hint_aria")}  // "Nhấn Enter để gửi, Shift+Enter xuống dòng"
</span>
```

### Keyboard Navigation

| Keybinding | Action |
|:---|:---|
| `Tab` | Di chuyển qua các interactive elements |
| `Enter` / `Space` | Activate button, expand collapsible |
| `Escape` | Đóng dropdown/dialog |
| `Ctrl/Cmd+J` (global) | Toggle AI panel (đã implement) |
| `Shift+Enter` | Xuống dòng trong Composer mà không gửi |
| `Arrow Up/Down` | Navigate conversation history dropdown |

### New i18n Keys cho Accessibility

```ts
"ai.panel.aria_label"
"ai.aria.run_started"          // "Olorin đang xử lý yêu cầu"
"ai.aria.run_finished"         // "Olorin đã hoàn thành"
"ai.composer.input_aria"
"ai.composer.hint_aria"
"ai.approval.approve_aria"     // Bao gồm summary action
```

---

## 12. Liên kết tài liệu liên quan

- [`code-mode-design.md`](../../arda-be/docs/ai/code-mode-design.md) — Thiết kế sandbox, SDK Error Contract.
- [`sandbox-threat-model.md`](../../arda-be/docs/ai/sandbox-threat-model.md) — Threat model cho execute meta-tool.
- [`tool-contracts.md`](../../arda-be/docs/ai/tool-contracts.md) — Execution Pipeline cho `search` + `execute`.
- [`human-in-the-loop.md`](../../arda-be/docs/ai/human-in-the-loop.md) — Approval resume protocol.
- [`agent-boundaries.md`](../../arda-be/docs/ai/agent-boundaries.md) — Sandboxed Code Execution vs Side Effect.
- [`performance-baseline.md`](../../arda-be/docs/ai/performance-baseline.md) — Token cost và latency targets.
- [`ai-integration-guide.md`](./ai-integration-guide.md) — Hướng dẫn cho domain MFE teams.
