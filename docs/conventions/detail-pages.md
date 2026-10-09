# Detail pages (record view / edit / create)

Which surface opens a record depends on how complex the form is. The target is
laptop and 24" desktop screens, so records get their own page and URL instead of
a modal.

| Form | Surface |
| --- | --- |
| Confirmations, 1–2 fields | Dialog |
| Small lookups (<= 6 fields, no dependencies) | Dialog (existing behaviour) |
| Master data and business records (users, customers, contracts...) | **Detail page** with its own URL |
| Work queues (approvals, workbench) | Master–detail, later |

## URLs and modes

```
/admin/users            list
/admin/users/new        create page
/admin/users/:id        read-only view
/admin/users/:id?mode=edit   edit mode (same page, form instead of values)
```

- Open in **view** mode first; editing is an explicit action. This avoids
  accidental edits to financial and identity data.
- Remotes resolve routes by path prefix (`createRemoteRoutes`), not by React
  Router params. Register the list as `exact`, then `/new`, then the bare prefix
  as the detail page, and read the id from the pathname.
- Keep tenant/org scope in the query string when the API needs it
  (`?tenant=...`).

## Shared components (`@workspace/ui`)

- `DetailPageShell` — header (back link, title, status badges, actions), section
  navigation from `xl` up, scrolling body capped for wide monitors, footer slot.
- `DetailSection` — titled card; its `id` is the anchor for the section nav.
- `DescriptionList` — label/value grid for view mode; empty values show `—`.
- `DetailFooterBar` — sticky action bar with the "unsaved changes" indicator.
- `DiscardChangesDialog` — confirm before leaving a dirty form.
- `useUnsavedChangesGuard(dirty)` — `beforeunload` warning. The shell uses
  `BrowserRouter`, so in-app navigation cannot be blocked; guard Back/Cancel with
  `DiscardChangesDialog` instead.

These components are router-agnostic and carry no copy; pages pass translated
labels. View, edit and create share the same section ids so the three modes look
alike.

## Reference implementation

`apps/iam/src/features/users`: `page.tsx` (list), `create-page.tsx`,
`detail-page.tsx`, `components/UserFormSections.tsx` (shared form fields) and
`components/use-user-actions.tsx` (row/record actions shared by the list and the
detail page).
