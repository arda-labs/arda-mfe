# Task P5.2c — MFE Chat Thumbs Up/Down UI for knowledge.search Results

## Files changed

| File | Action | Summary |
|---|---|---|
| `packages/ai/src/components/tools/knowledge-search-feedback.tsx` | **Create** | New component rendering `knowledge.search` array items (title, heading, score, snippet) with a feedback footer. Handles 4 states: unrated, submitting, rated, error. Uses `postCanonical` from `@workspace/api` to POST `/api/ai/feedback` with `{run_id, helpful}`. Registers as `arda.knowledge-search-feedback` renderer. |
| `packages/ai/src/components/olorin-panel.tsx` | **Modify** | Import and call `registerKnowledgeSearchFeedbackRenderer()` alongside existing renderer registrations. |
| `packages/ai/src/index.ts` | **Modify** | Export `KnowledgeSearchFeedback` and `registerKnowledgeSearchFeedbackRenderer` from the package public API. |
| `packages/ai/locales/en-US.json` | **Modify** | Add 5 i18n keys under `feedback.*`: `rate`, `rated`, `helpful`, `not_helpful`, `error`. |
| `packages/ai/locales/vi-VN.json` | **Modify** | Add Vietnamese translations for the same 5 keys. |

## Typecheck result

`bun run typecheck` passed on all 18 workspaces, including `@workspace/ai` (which previously failed with a TS2677 type-predicate error — fixed by changing `isKnowledgeSearchResult` from a type predicate to a `boolean` return).

## Self-review findings

- **Rendering precedence**: The `arna.knowledge-search-feedback` renderer matches `Array.isArray(result) && result.length > 0 && typeof result[0]?.runId === "string"`. This is intentionally the same match condition the brief specifies. The match is checked before the `isArrayResult` fallback in `GenericToolView` (first-custom-renderer-wins), so knowledge.search arrays now render via this component instead of the generic `DataTableView`. This is the desired behavior — the component renders the search items itself plus the feedback footer.
- **State management**: Local `useState` for feedback state (not persisted across re-renders) — this is fine for phase 1. The brief explicitly says phase 1 skips persistence.
- **Error recovery**: On error, buttons re-enable and the user can retry. The selected thumb remains highlighted (ghost + primary) to indicate which option was tried.
- **Submitting lock**: Both buttons disabled during the POST, preventing duplicate requests.
- **No `comment` field**: The brief says comment is optional and skipped in phase 1. The API call sends `{run_id, helpful}` only.
- **`messageId` not used**: The brief notes `messageId` is not needed in phase 1. The component signature accepts `ToolResultViewProps` (which includes `messageId`) but doesn't use it.
- **`runId` from `result[0]`**: All items in one knowledge.search result set share the same RAG `runId` per the BE contract. The code takes `result[0]?.runId` as documented.

## Concerns

None. All BE endpoints (feedback POST, runId projection) are already merged and reviewed. The MFE work is self-contained, typecheck passes, and the diff is clean.