import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import type { LookupCategory, LookupValue } from "../api"
import { platformApi } from "../api"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
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
import { ChevronRight, Edit2, Plus, Tag, Trash2 } from "lucide-react"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { CategoryDialog } from "./components/CategoryDialog"
import { ValueDialog } from "./components/ValueDialog"

const DEFAULT_PAGE_SIZE = 10

export function LookupsPage() {
  const { t } = useI18n()
  const [selectedCat, setSelectedCat] = useState<LookupCategory | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<LookupCategory | null>(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState<LookupCategory | null>(
    null
  )
  const [valDialogOpen, setValDialogOpen] = useState(false)
  const [editingVal, setEditingVal] = useState<LookupValue | null>(null)
  const [deleteValTarget, setDeleteValTarget] = useState<LookupValue | null>(
    null
  )
  const [categories, setCategories] = useState<LookupCategory[]>([])
  const [values, setValues] = useState<LookupValue[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingValues, setLoadingValues] = useState(false)
  const [catDeletePending, setCatDeletePending] = useState(false)
  const [valDeletePending, setValDeletePending] = useState(false)
  const categoriesLoadedRef = useRef(false)
  const selectedCatCodeRef = useRef<string | undefined>(undefined)

  const loadCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const result = await platformApi.listLookupCategories()
      setCategories(result)
    } catch {
      // handled in effect
    } finally {
      setLoadingCats(false)
    }
  }, [])

  const loadValues = useCallback(async (categoryCode: string) => {
    setLoadingValues(true)
    try {
      const result = await platformApi.listLookupValues(categoryCode)
      setValues(result)
    } catch {
      // handled in effect
    } finally {
      setLoadingValues(false)
    }
  }, [])

  useEffect(() => {
    if (!categoriesLoadedRef.current) {
      categoriesLoadedRef.current = true
      void loadCategories()
    }
  }, [loadCategories])

  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0])
    }
  }, [categories, selectedCat])

  useEffect(() => {
    if (selectedCat?.code && selectedCat.code !== selectedCatCodeRef.current) {
      selectedCatCodeRef.current = selectedCat.code
      void loadValues(selectedCat.code)
    }
  }, [selectedCat, loadValues])

  const openCreateCat = () => {
    setEditingCat(null)
    setCatDialogOpen(true)
  }

  const openEditCat = (cat: LookupCategory, event: MouseEvent) => {
    event.stopPropagation()
    setEditingCat(cat)
    setCatDialogOpen(true)
  }

  const handleCatDelete = async () => {
    if (!deleteCatTarget) return
    setCatDeletePending(true)
    try {
      await platformApi.deleteLookupCategory(deleteCatTarget.id)
      notify.success("Xóa danh mục thành công")
      if (selectedCat?.id === deleteCatTarget.id) {
        setSelectedCat(null)
      }
      setDeleteCatTarget(null)
      await loadCategories()
    } catch (err) {
      notify.error("Xóa danh mục thất bại", translateApiError(err))
    } finally {
      setCatDeletePending(false)
    }
  }

  const openCreateVal = () => {
    if (!selectedCat) return
    setEditingVal(null)
    setValDialogOpen(true)
  }

  const openEditVal = (value: LookupValue) => {
    setEditingVal(value)
    setValDialogOpen(true)
  }

  const handleValDelete = async () => {
    if (!deleteValTarget || !selectedCat) return
    setValDeletePending(true)
    try {
      await platformApi.deleteLookupValue(deleteValTarget.id)
      notify.success("Xóa giá trị thành công")
      setDeleteValTarget(null)
      await loadValues(selectedCat.code)
    } catch (err) {
      notify.error("Xóa giá trị thất bại", translateApiError(err))
    } finally {
      setValDeletePending(false)
    }
  }

  const columns = useMemo<ColumnDef<LookupValue>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.lookups.field.code")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.lookups.field.name")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.lookups.field.name"),
          t("platform.lookups.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.lookups.field.sort_order")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.sort_order}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.lookups.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("platform.lookups.field.status"),
          t("platform.lookups.status.active"),
          t("platform.lookups.status.inactive")
        ),
        cell: ({ row }) => {
          const active = row.original.is_active
          return (
            <Status variant={active ? "success" : "default"}>
              <StatusIndicator />
              <StatusLabel>
                {active
                  ? t("platform.lookups.status.active")
                  : t("platform.lookups.status.inactive")}
              </StatusLabel>
            </Status>
          )
        },
      },
      {
        accessorKey: "metadata",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.lookups.field.metadata")}
          />
        ),
        cell: ({ row }) =>
          row.original.metadata ? (
            <code className="max-w-[200px] truncate rounded border border-muted/80 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px]">
              {row.original.metadata}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("common.action.edit")}
              onClick={() => openEditVal(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              title={t("common.action.delete")}
              onClick={() => setDeleteValTarget(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: values,
    filterBy: {
      name: (item, value) => matchTextColumnFilter(value, item.name, item.code),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        sort_order: (a, b) => a.sort_order - b.sort_order,
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title={t("platform.lookups.title")}
        meta={
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            {t("platform.lookups.count", { count: categories.length })}
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-muted/50 md:col-span-1">
          <div className="flex shrink-0 items-center justify-between border-b border-muted bg-muted/5 p-4">
            <span className="text-sm font-bold">
              {t("platform.lookups.categories.title")}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs font-semibold"
              onClick={openCreateCat}
            >
              <Plus className="size-3" />
              {t("platform.lookups.categories.create")}
            </Button>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-muted/30 overflow-y-auto">
            {loadingCats ? (
              <div className="space-y-3 p-4">
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted/40" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted/40" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted/40" />
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t("platform.lookups.categories.empty")}
              </div>
            ) : (
              categories.map((cat) => {
                const isSelected = selectedCat?.code === cat.code
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCat(cat)}
                    className={`group flex cursor-pointer items-center justify-between p-3.5 transition-colors ${
                      isSelected
                        ? "bg-primary/10 font-semibold text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Tag
                        className={`size-4 shrink-0 ${
                          isSelected
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm">{cat.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {cat.code}
                          </span>
                          {cat.scope_type !== "global" && (
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[9px] font-normal"
                            >
                              {t(`platform.lookups.scope_type.${cat.scope_type}`)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 opacity-0 group-hover:opacity-100"
                        title={t("common.action.edit")}
                        onClick={(event) => openEditCat(cat, event)}
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      {!cat.is_system && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-destructive opacity-0 group-hover:opacity-100"
                          title={t("common.action.delete")}
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeleteCatTarget(cat)
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                      <ChevronRight
                        className={`size-4 ${
                          isSelected
                            ? "text-primary"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-muted/50 md:col-span-2">
          {selectedCat ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-muted bg-muted/5 p-4">
                <div>
                  <span className="text-sm font-bold">
                    {t("platform.lookups.values.title", {
                      name: selectedCat.name,
                    })}
                  </span>
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedCat.code} &bull;{" "}
                    {t("platform.lookups.values.count", {
                      count: values.length,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs font-semibold"
                  onClick={openCreateVal}
                >
                  <Plus className="size-3.5" />
                  {t("platform.lookups.values.create")}
                </Button>
              </div>

              <div className="relative min-h-0 flex-1 p-4">
                {loadingValues ? (
                  <DataTableSkeleton columnCount={5} rowCount={6} />
                ) : (
                  <DataTable
                    table={table}
                    totalRows={total}
                    className="min-h-0 flex-1"
                  >
                    <ListTableToolbar
                      table={table}
                      onCreate={openCreateVal}
                      createLabel={t("platform.lookups.values.create")}
                    />
                  </DataTable>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("platform.lookups.values.select_category")}
            </div>
          )}
        </div>
      </div>

      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        editingCat={editingCat}
        onSuccess={loadCategories}
      />

      <ValueDialog
        open={valDialogOpen}
        onOpenChange={setValDialogOpen}
        editingVal={editingVal}
        selectedCat={selectedCat}
        onSuccess={async () => {
          if (selectedCat) await loadValues(selectedCat.code)
        }}
      />

      <AlertDialog
        open={!!deleteCatTarget}
        onOpenChange={() => setDeleteCatTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("platform.lookups.delete.category_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.lookups.delete.category_description", {
                name: deleteCatTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCatDelete}
              disabled={catDeletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.lookups.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteValTarget}
        onOpenChange={() => setDeleteValTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("platform.lookups.delete.value_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.lookups.delete.value_description", {
                name: deleteValTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleValDelete}
              disabled={valDeletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.lookups.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
