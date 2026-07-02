import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { Organization, Parameter } from "../api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@workspace/ui/components/command"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { Check, ChevronsUpDown, Edit2, Eye, EyeOff, Key, Plus, Search, Trash2 } from "lucide-react"

const valueTypeValues = ["string", "number", "boolean", "json", "date"] as const
const scopeTypeValues = ["global", "tenant", "org", "branch", "department"] as const

const VALUE_TYPES = [
  { value: "string", label: "Chuoi (String)" },
  { value: "number", label: "So (Number)" },
  { value: "boolean", label: "Boolean (Dung/Sai)" },
  { value: "json", label: "Cau hinh JSON" },
  { value: "date", label: "Ngay thang (Date)" },
] as const

const SCOPE_TYPES = [
  { value: "global", label: "Toan cuc (Global)" },
  { value: "tenant", label: "Khach hang (Tenant)" },
  { value: "org", label: "To chuc (Organization)" },
  { value: "branch", label: "Chi nhanh (Branch)" },
  { value: "department", label: "Phong ban (Department)" },
] as const

const parameterFormSchema = z
  .object({
    key: z.string().trim().min(1, "Khoa tham so la bat buoc").max(128, "Khoa tham so qua dai"),
    value: z.string(),
    value_type: z.enum(valueTypeValues),
    scope_type: z.enum(scopeTypeValues),
    scope_id: z.string().trim().optional(),
    description: z.string().trim().max(500, "Mo ta qua dai").optional(),
    is_secret: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.is_secret && !values.value.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Gia tri tham so la bat buoc",
        path: ["value"],
      })
    }
    if (values.scope_type !== "global" && !values.scope_id?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Scope ID la bat buoc",
        path: ["scope_id"],
      })
    }
    if (values.value_type === "number" && values.value.trim() && !Number.isFinite(Number(values.value))) {
      ctx.addIssue({
        code: "custom",
        message: "Gia tri number khong hop le",
        path: ["value"],
      })
    }
    if (values.value_type === "json" && values.value.trim()) {
      try {
        JSON.parse(values.value)
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Gia tri JSON khong hop le",
          path: ["value"],
        })
      }
    }
  })

type ParameterFormValues = z.infer<typeof parameterFormSchema>

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
  const [params, setParams] = useState<Parameter[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [orgSearchOpen, setOrgSearchOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Parameter | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterFormSchema),
    defaultValues: parameterDefaultValues,
  })
  const valueType = watch("value_type")
  const scopeType = watch("scope_type")
  const scopeId = watch("scope_id")
  const value = watch("value")

  const load = async () => {
    setLoading(true)
    try {
      const [data, orgList] = await Promise.all([
        platformApi.listParameters(),
        platformApi.listOrganizations().catch(() => []),
      ])
      setParams(data)
      setOrgs(orgList)
    } catch (err) {
      notify.error("Khong the tai du lieu tham so", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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
      await load()
    } catch (err) {
      notify.error("Luu tham so that bai", translateApiError(err))
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteParameter(deleteTarget.id)
      notify.success("Xoa tham so thanh cong")
      setDeleteTarget(null)
      await load()
    } catch (err) {
      notify.error("Xoa tham so that bai", translateApiError(err))
    }
  }

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets((previous) => ({ ...previous, [id]: !previous[id] }))
  }

  const filteredParams = params.filter(
    (param) =>
      param.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (param.description && param.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Tham so he thong</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {filteredParams.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 text-sm font-semibold">
          <Plus className="size-4" /> Them tham so
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-muted/60 bg-muted/10 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tim kiem theo ten tham so hoac mo ta..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-xl pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Dang tai cau hinh tham so...
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-muted/50 bg-background shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tham so (Key)</TableHead>
                  <TableHead>Gia tri (Value)</TableHead>
                  <TableHead>Kieu du lieu</TableHead>
                  <TableHead>Pham vi (Scope)</TableHead>
                  <TableHead>Mo ta</TableHead>
                  <TableHead className="text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Khong tim thay tham so nao.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParams.map((param) => {
                    const isRevealed = revealedSecrets[param.id]
                    return (
                      <TableRow key={param.id}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{param.key}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {param.is_secret ? (
                            <div className="flex items-center gap-2">
                              <Key className="size-3.5 shrink-0 text-yellow-500" />
                              <span className="font-mono text-xs">{isRevealed ? param.value || "[Bao mat]" : "************"}</span>
                              <button
                                type="button"
                                onClick={() => toggleRevealSecret(param.id)}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            </div>
                          ) : param.value_type === "boolean" ? (
                            <Status variant={param.value === "true" ? "success" : "default"}>
                              <StatusIndicator />
                              <StatusLabel>{param.value === "true" ? "TRUE" : "FALSE"}</StatusLabel>
                            </Status>
                          ) : param.value_type === "json" ? (
                            <code className="rounded border border-muted/80 bg-muted/30 px-1.5 py-0.5 text-xs">JSON</code>
                          ) : (
                            <span className="font-mono text-xs">{param.value}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {param.value_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-semibold capitalize">
                            {param.scope_type}{" "}
                            {param.scope_id
                              ? param.scope_type === "org"
                                ? `(${orgs.find((org) => org.id === param.scope_id)?.name || param.scope_id})`
                                : `(${param.scope_id})`
                              : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-xs text-muted-foreground">{param.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(param)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(param)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingParam ? "Cap nhat tham so" : "Them tham so moi"}</DialogTitle>
            <DialogDescription>Tuy chinh thong tin cau hinh tham so dong cho cac phan he chuc nang.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitParameter} className="space-y-4 py-2">
            <FormField label="Khoa tham so (Key)" htmlFor="param_key" error={errors.key?.message}>
              <Input
                id="param_key"
                placeholder="APP_ROUTING_TIMEOUT"
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
              <FormField label="Kieu du lieu" htmlFor="param_value_type" error={errors.value_type?.message}>
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
                        {VALUE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Pham vi hieu luc" htmlFor="param_scope_type" error={errors.scope_type?.message}>
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
                        {SCOPE_TYPES.map((scope) => (
                          <SelectItem key={scope.value} value={scope.value}>
                            {scope.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            {scopeType !== "global" && (
              <FormField label="Ma dinh danh pham vi (Scope ID)" htmlFor="param_scope_id" error={errors.scope_id?.message}>
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
                            className="h-10 w-full justify-between rounded-xl text-left font-normal"
                          >
                            {field.value ? orgs.find((org) => org.id === field.value)?.name || field.value : "Chon to chuc..."}
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] rounded-xl p-0" align="start">
                          <Command className="rounded-xl">
                            <CommandInput placeholder="Tim kiem to chuc..." />
                            <CommandList>
                              <CommandEmpty>Khong tim thay to chuc nao.</CommandEmpty>
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
                                      <span className="font-mono text-[10px] text-muted-foreground">{org.code}</span>
                                    </div>
                                    <Check className={cn("size-4 text-primary", field.value === org.id ? "opacity-100" : "opacity-0")} />
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
                    placeholder={`Ma ${scopeType} can ap dung`}
                    aria-invalid={Boolean(errors.scope_id)}
                    autoComplete="off"
                    {...register("scope_id")}
                  />
                )}
              </FormField>
            )}

            <FormField label="Gia tri tham so (Value)" htmlFor="param_value" error={errors.value?.message}>
              {valueType === "boolean" ? (
                <div className="flex h-10 w-fit items-center rounded-lg border border-input bg-background p-0.5 px-1">
                  <Button
                    type="button"
                    variant={value === "true" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setValue("value", "true", { shouldDirty: true, shouldValidate: true })}
                  >
                    TRUE
                  </Button>
                  <Button
                    type="button"
                    variant={value === "false" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setValue("value", "false", { shouldDirty: true, shouldValidate: true })}
                  >
                    FALSE
                  </Button>
                </div>
              ) : valueType === "json" ? (
                <Textarea
                  id="param_value"
                  placeholder='{ "key": "value" }'
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
                  placeholder="Nhap gia tri"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.value)}
                  {...register("value")}
                />
              )}
            </FormField>

            <FormField label="Mo ta tham so" htmlFor="param_description" error={errors.description?.message}>
              <Input
                id="param_description"
                placeholder="Giai thich muc dich cau hinh tham so..."
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
                    Day la tham so bao mat
                  </label>
                </div>
              )}
            />

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa tham so?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanh dong nay se xoa hoan toan tham so <strong>{deleteTarget?.key}</strong> khoi he thong va khong the khoi phuc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
