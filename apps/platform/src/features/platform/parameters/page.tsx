import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import type { Organization, Parameter } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@workspace/ui/components/command"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Textarea } from "@workspace/ui/components/textarea"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { Check, ChevronsUpDown, Edit2, Eye, EyeOff, Key, Trash2 } from "lucide-react"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/ui/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/ui/admin-list/client-list"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"

const DEFAULT_PAGE_SIZE = 10

const valueTypeValues = ["string", "number", "boolean", "json", "date"] as const
const scopeTypeValues = ["global", "tenant", "org", "branch", "department"] as const

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildParameterSchema(t: TranslateFn) {
  return z
    .object({
      key: z
        .string()
        .trim()
        .min(1, t("platform.parameters.validation.key_required"))
        .max(128, t("platform.parameters.validation.key_too_long")),
      value: z.string(),
      value_type: z.enum(valueTypeValues),
      scope_type: z.enum(scopeTypeValues),
      scope_id: z.string().trim().optional(),
      description: z
        .string()
        .trim()
        .max(500, t("platform.parameters.validation.description_too_long"))
        .optional(),
      is_secret: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (!values.is_secret && !values.value.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.value_required"),
          path: ["value"],
        })
      }
      if (values.scope_type !== "global" && !values.scope_id?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.scope_id_required"),
          path: ["scope_id"],
        })
      }
      if (
        values.value_type === "number" &&
        values.value.trim() &&
        !Number.isFinite(Number(values.value))
      ) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.number_invalid"),
          path: ["value"],
        })
      }
      if (values.value_type === "json" && values.value.trim()) {
        try {
          JSON.parse(values.value)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.parameters.validation.json_invalid"),
            path: ["value"],
          })
        }
      }
    })
}

type ParameterFormValues = z.infer<ReturnType<typeof buildParameterSchema>>

const parameterDefaultValues: ParameterFormValues = {
  key: "",
  value: "",
  value_type: "string",
  scope_type: "global",
  scope_id: "",
  description: "",
  is_secret: false,
}

function toParameterFormValues(item: Parameter): ParameterFormValues {
  return {
    key: item.key,
    value: item.value,
    value_type: item.value_type,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    description: item.description || "",
    is_secret: item.is_secret,
  }
}

export function ParametersPage() {
  const { t } = useI18n()
  const [orgSearchOpen, setOrgSearchOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Parameter | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
  const [params, setParams] = useState<Parameter[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadParameters = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const [paramsResult, orgsResult] = await Promise.all([
        platformApi.listParameters(),
        platformApi.listOrganizations({ view: "options" }).catch(() => ({ items: [] as Organization[] })),
      ])
      setParams(paramsResult)
      setOrgs(orgsResult.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadParameters(true)
  }, [loadParameters])

  const parameterSchema = useMemo(() => buildParameterSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterSchema),
    defaultValues: parameterDefaultValues,
  })
  const valueType = watch("value_type")
  const scopeType = watch("scope_type")
  const value = watch("value")

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets((previous) => ({ ...previous, [id]: !previous[id] }))
  }

  const openCreate = () => {
    setEditingParam(null)
    reset(parameterDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (param: Parameter) => {
    setEditingParam(param)
    reset(toParameterFormValues(param))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingParam(null)
      setOrgSearchOpen(false)
      reset(parameterDefaultValues)
    }
  }

  const submitParameter = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<Parameter> = {
        key: values.key.trim().toUpperCase().replace(/\s+/g, "_"),
        value: values.value,
        value_type: values.value_type,
        scope_type: values.scope_type,
        scope_id: values.scope_id?.trim() || undefined,
        description: values.description?.trim() || undefined,
        is_secret: values.is_secret,
      }
      if (editingParam) {
        payload.id = editingParam.id
      }
      await platformApi.upsertParameter(payload)
      notify.success("Luu tham so he thong thanh cong")
      setDialogOpen(false)
      reset(parameterDefaultValues)
      await loadParameters()
    } catch (err) {
      notify.error("Luu tham so that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteParameter(deleteTarget.id)
      notify.success("Xoa tham so thanh cong")
      setDeleteTarget(null)
      await loadParameters()
    } catch (err) {
      notify.error("Xoa tham so that bai", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<Parameter>[]>(
    () => [
      {
        id: "key",
        accessorKey: "key",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.parameters.field.key")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.parameters.field.key"),
          t("platform.parameters.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.original.key}</span>
        ),
      },
      {
        accessorKey: "value",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.parameters.field.value")} />
        ),
        cell: ({ row }) => {
          const param = row.original
          const isRevealed = revealedSecrets[param.id]
          if (param.is_secret) {
            return (
              <div className="flex max-w-xs items-center gap-2">
                <Key className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-xs">
                  {isRevealed
                    ? param.value || t("platform.parameters.secret.empty")
                    : t("platform.parameters.secret.masked")}
                </span>
                <button
                  type="button"
                  onClick={() => toggleRevealSecret(param.id)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            )
          }
          if (param.value_type === "boolean") {
            return (
              <Status variant={param.value === "true" ? "success" : "default"}>
                <StatusIndicator />
                <StatusLabel>
                  {param.value === "true"
                    ? t("platform.parameters.boolean.true")
                    : t("platform.parameters.boolean.false")}
                </StatusLabel>
              </Status>
            )
          }
          if (param.value_type === "json") {
            return (
              <code className="rounded border border-muted/80 bg-muted/30 px-1.5 py-0.5 text-xs">
                JSON
              </code>
            )
          }
          return <span className="max-w-xs truncate font-mono text-xs">{param.value}</span>
        },
        enableSorting: false,
      },
      {
        accessorKey: "value_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.parameters.field.value_type")} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {t(`platform.parameters.value_type.${row.original.value_type}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "scope_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.parameters.field.scope")} />
        ),
        cell: ({ row }) => {
          const param = row.original
          const scopeLabel = t(`platform.parameters.scope_type.${param.scope_type}`)
          const scopeDetail =
            param.scope_id && param.scope_type === "org"
              ? orgs.find((org) => org.id === param.scope_id)?.name || param.scope_id
              : param.scope_id
          return (
            <Badge variant="secondary" className="text-xs font-semibold">
              {scopeLabel}
              {scopeDetail ? ` (${scopeDetail})` : ""}
            </Badge>
          )
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.parameters.field.description")} />
        ),
        cell: ({ row }) => (
          <span className="max-w-sm truncate text-xs text-muted-foreground">
            {row.original.description || "-"}
          </span>
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
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              title={t("common.action.delete")}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, orgs, revealedSecrets]
  )

  const { table, total } = useClientListTable({
    columns,
    items: params,
    filterBy: {
      key: (item, value) => matchTextColumnFilter(value, item.key, item.description),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        key: (a, b) => a.key.localeCompare(b.key),
        value_type: (a, b) => a.value_type.localeCompare(b.value_type),
        scope_type: (a, b) => a.scope_type.localeCompare(b.scope_type),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingParam
                ? t("platform.parameters.edit")
                : t("platform.parameters.create_title")}
            </DialogTitle>
            <DialogDescription>{t("platform.parameters.dialog_description")}</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitParameter} className="space-y-4 py-2">
            <FormField
              label={t("platform.parameters.field.key")}
              htmlFor="param_key"
              error={errors.key?.message}
            >
              <Input
                id="param_key"
                placeholder={t("platform.parameters.placeholder.key")}
                aria-invalid={Boolean(errors.key)}
                disabled={!!editingParam}
                className="font-mono uppercase"
                autoComplete="off"
                {...register("key", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                  },
                })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.parameters.field.value_type")}
                htmlFor="param_value_type"
                error={errors.value_type?.message}
              >
                <Controller
                  control={control}
                  name="value_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(selectedValue) => {
                        field.onChange(selectedValue)
                        setValue("value", "", { shouldDirty: true, shouldValidate: true })
                      }}
                    >
                      <SelectTrigger id="param_value_type" aria-invalid={Boolean(errors.value_type)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {valueTypeValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`platform.parameters.value_type.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.parameters.field.scope")}
                htmlFor="param_scope_type"
                error={errors.scope_type?.message}
              >
                <Controller
                  control={control}
                  name="scope_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(selectedValue) => {
                        field.onChange(selectedValue)
                        setValue("scope_id", "", { shouldDirty: true, shouldValidate: true })
                      }}
                    >
                      <SelectTrigger id="param_scope_type" aria-invalid={Boolean(errors.scope_type)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopeTypeValues.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {t(`platform.parameters.scope_type.${scope}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            {scopeType !== "global" && (
              <FormField
                label={t("platform.parameters.field.scope_id")}
                htmlFor="param_scope_id"
                error={errors.scope_id?.message}
              >
                {scopeType === "org" ? (
                  <Controller
                    control={control}
                    name="scope_id"
                    render={({ field }) => (
                      <Popover open={orgSearchOpen} onOpenChange={setOrgSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={orgSearchOpen}
                            className="h-10 w-full justify-between text-left font-normal"
                          >
                            {field.value
                              ? orgs.find((org) => org.id === field.value)?.name || field.value
                              : t("platform.parameters.placeholder.org_select")}
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={t("platform.parameters.placeholder.org_search")} />
                            <CommandList>
                              <CommandEmpty>{t("platform.parameters.empty_orgs")}</CommandEmpty>
                              <CommandGroup>
                                {orgs.map((org) => (
                                  <CommandItem
                                    key={org.id}
                                    value={org.name}
                                    onSelect={() => {
                                      field.onChange(org.id)
                                      setOrgSearchOpen(false)
                                    }}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{org.name}</span>
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {org.code}
                                      </span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "size-4 text-primary",
                                        field.value === org.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                ) : (
                  <Input
                    id="param_scope_id"
                    placeholder={t("platform.parameters.placeholder.scope_id", { scope: scopeType })}
                    aria-invalid={Boolean(errors.scope_id)}
                    autoComplete="off"
                    {...register("scope_id")}
                  />
                )}
              </FormField>
            )}

            <FormField
              label={t("platform.parameters.field.value")}
              htmlFor="param_value"
              error={errors.value?.message}
            >
              {valueType === "boolean" ? (
                <div className="flex h-10 w-fit items-center rounded-lg border border-input bg-background p-0.5 px-1">
                  <Button
                    type="button"
                    variant={value === "true" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setValue("value", "true", { shouldDirty: true, shouldValidate: true })}
                  >
                    {t("platform.parameters.boolean.true")}
                  </Button>
                  <Button
                    type="button"
                    variant={value === "false" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setValue("value", "false", { shouldDirty: true, shouldValidate: true })}
                  >
                    {t("platform.parameters.boolean.false")}
                  </Button>
                </div>
              ) : valueType === "json" ? (
                <Textarea
                  id="param_value"
                  placeholder={t("platform.parameters.placeholder.value_json")}
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.value)}
                  {...register("value")}
                />
              ) : valueType === "date" ? (
                <Input id="param_value" type="date" aria-invalid={Boolean(errors.value)} {...register("value")} />
              ) : (
                <Input
                  id="param_value"
                  placeholder={t("platform.parameters.placeholder.value")}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.value)}
                  {...register("value")}
                />
              )}
            </FormField>

            <FormField
              label={t("platform.parameters.field.description")}
              htmlFor="param_description"
              error={errors.description?.message}
            >
              <Input
                id="param_description"
                placeholder={t("platform.parameters.placeholder.description")}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
            </FormField>

            <Controller
              control={control}
              name="is_secret"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="param_is_secret"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <label htmlFor="param_is_secret" className="cursor-pointer select-none text-sm font-medium">
                    {t("platform.parameters.field.is_secret")}
                  </label>
                </div>
              )}
            />

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || saving}>
                {isSubmitting || saving
                  ? t("common.action.saving")
                  : t("common.action.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("platform.parameters.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.parameters.delete.description", { key: deleteTarget?.key ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.parameters.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.parameters.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.parameters.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadParameters}
      loadErrorTitle={t("platform.parameters.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.parameters.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
