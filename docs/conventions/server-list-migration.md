# Server List Migration Guide

Conventions the checklist enforces live in `../docs/conventions/mfe-structure.md`
and `docs/refactor-program.md`. Working exemplar:
`apps/finance/src/features/finance/transactions/page.tsx`
(reference implementation of the full tree: platform organizations).

## Preconditions (already satisfied monorepo-wide)

- The remote's `src/Routes.tsx` mounts `QueryProvider` (`@workspace/query/provider`)
  as `wrapper:` for `createRemoteRoutes`, or wraps the custom route component.
- URL carries `page` / `perPage` (and future filters). Query state never lives
  in component state.

## Checklist

1. **Declare one definition** beside the feature (`list-query.ts` or page top):
   ```ts
   export const transactionsListDefinition = defineServerList({
     queryKey: ["<domain>", "<resource>", "list"] as const,
     queryConfig: {
       defaultPageSize: 10,
       sortableColumns: ["created_at"],
       filters: [{ urlKey: "status", mode: "single", allowedValues: [...] }],
     },
   })
   ```
2. **One controller** in the page — do NOT compose `useServerListQuery` +
   `useDataTable` manually (two URL parsers drift):
   ```ts
   const { total, isLoading, isFetching, error: listError, refetch, table } =
     useServerDataTable<Transaction>({
       ...transactionsListDefinition,
       columns,
       queryFn: async (query, { signal }) => featureApi.list(query, signal),
     })
   ```
3. **Wire shell props**: `criticalPending={isLoading}`,
   `criticalError={listError ?? null}`, `onRetry={() => void refetch()}`,
   `fetching={isFetching}`, `totalRows={total}`.
4. **Mutations refresh via cache**, never local list state:
   after create/update/delete call `await refetch()` (or an invalidated hook).
5. **Split the file** once past ~400 lines into `components/` dialogs /
   `TableView`; `bun run check:pages` blocks regressions outside the dated
   `LEGACY_BASELINE`.
6. **Advanced search** shares the SAME definition through
   `applyServerListFilters(searchParams, values, definition.queryConfig)` so the
   toolbar and any bespoke form can never disagree about URL keys.
