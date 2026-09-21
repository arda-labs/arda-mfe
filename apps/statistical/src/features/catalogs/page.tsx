import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { statisticalApi, type CatalogItem } from "../api"

/**
 * QCMS catalogs (W5): one tab per EPAS catalog screen (indicator type, stat
 * code map, regulation, response definition, statuses, rules, KPI, report
 * groups, import + CMMS). attributes carries kind-specific fields as JSON.
 */
export function CatalogsPage() {
  const { t } = useI18n()
  const [kinds, setKinds] = useState<string[]>([])
  const [kind, setKind] = useState("")
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CatalogItem | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CatalogItem | null>(
    null
  )
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    void statisticalApi
      .listCatalogKinds()
      .then((list) => {
        setKinds(list.items)
        if (list.items.length > 0) setKind((prev) => prev || list.items[0])
      })
      .catch(() => setKinds([]))
  }, [])

  const load = useCallback(async (initial = false) => {
    if (!kind) return
    if (initial) setLoading(true)
    setLoadError(null)
    try {
      const result = await statisticalApi.listCatalogItems(kind, true)
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    void load(true)
  }, [load])

  const columns = useMemo<ColumnDef<CatalogItem>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("common.field.code"), t("statistical.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "parent_code",
        accessorKey: "parent_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("statistical.catalogs.field.parent")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.parent_code || "—"}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active
              ? t("statistical.catalogs.active")
              : t("statistical.catalogs.inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.field.action")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                setEditTarget(row.original)
                setFormOpen(true)
              }}
            >
              {t("common.action.edit")}
            </button>
            {row.original.is_active ? (
              <button
                type="button"
                className="text-xs font-semibold text-destructive hover:underline"
                onClick={() => setDeactivateTarget(row.original)}
              >
                {t("statistical.catalogs.deactivate")}
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        parent_code: (a, b) => (a.parent_code ?? "").localeCompare(b.parent_code ?? ""),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: 10,
  })

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await statisticalApi.deactivateCatalogItem(kind, deactivateTarget.id)
      notify.success(t("statistical.catalogs.deactivate_success"))
      setDeactivateTarget(null)
      await load()
    } catch (err) {
      notify.error(
        t("statistical.catalogs.deactivate_failed"),
        translateApiError(err)
      )
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <ListPageShell
      title={t("statistical.catalogs.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("statistical.catalogs.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={false}
      table={table}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === kind
                  ? "rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  : "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60"
              }
              onClick={() => setKind(value)}
            >
              {t(`statistical.catalogs.kind.${value}`)}
            </button>
          ))}
          <ListTableToolbar
            table={table}
            onCreate={() => {
              setEditTarget(null)
              setFormOpen(true)
            }}
            createLabel={t("statistical.catalogs.create")}
            exportFilename={t("statistical.catalogs.title")}
            sheetName={t("statistical.catalogs.title")}
            totalRowsCount={total}
          />
        </div>
      }
      dialogs={
        <>
          <CatalogDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            kind={kind}
            item={editTarget}
            onSaved={() => load()}
          />
          <AlertDialog
            open={deactivateTarget !== null}
            onOpenChange={(next) => !next && setDeactivateTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("common.confirm.delete_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("common.confirm.delete_description", {
                    item: deactivateTarget?.name ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deactivating}
                  onClick={() => void handleDeactivate()}
                >
                  {t("statistical.catalogs.deactivate")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}

function CatalogDialog({
  open,
  onOpenChange,
  kind,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: string
  item: CatalogItem | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [parentCode, setParentCode] = useState("")
  const [attributes, setAttributes] = useState("{}")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(item?.code ?? "")
    setName(item?.name ?? "")
    setParentCode(item?.parent_code ?? "")
    setAttributes(JSON.stringify(item?.attributes ?? {}, null, 2))
  }, [item, open])

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("statistical.catalogs.validation.required"))
      return
    }
    let parsed: Record<string, unknown> = {}
    try {
      parsed = attributes.trim() ? JSON.parse(attributes) : {}
    } catch {
      notify.error(t("statistical.catalogs.validation.invalid_json"))
      return
    }
    setPending(true)
    try {
      await statisticalApi.upsertCatalogItem(kind, {
        code: code.trim(),
        name: name.trim(),
        parent_code: parentCode || undefined,
        attributes: parsed,
        is_active: true,
      })
      notify.success(t("statistical.catalogs.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("statistical.catalogs.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? t("statistical.catalogs.edit") : t("statistical.catalogs.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("common.field.code")}</Label>
            <Input
              value={code}
              disabled={Boolean(item)}
              className="font-mono"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("statistical.catalogs.field.parent")}</Label>
            <Input
              value={parentCode}
              className="font-mono"
              onChange={(e) => setParentCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>{t("statistical.catalogs.field.attributes")}</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
