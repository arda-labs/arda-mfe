import { useEffect, useState, type MouseEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { LookupCategory, LookupValue } from "../api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
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

const scopeTypeValues = ["global", "tenant", "org", "branch", "department"] as const

const SCOPE_TYPES = [
  { value: "global", label: "Toan cuc (Global)" },
  { value: "tenant", label: "Khach hang (Tenant)" },
  { value: "org", label: "To chuc (Organization)" },
  { value: "branch", label: "Chi nhanh (Branch)" },
  { value: "department", label: "Phong ban (Department)" },
] as const

const categoryFormSchema = z
  .object({
    code: z.string().trim().min(1, "Ma danh muc la bat buoc").max(64, "Ma danh muc qua dai"),
    name: z.string().trim().min(1, "Ten danh muc la bat buoc").max(255, "Ten danh muc qua dai"),
    scope_type: z.enum(scopeTypeValues),
    scope_id: z.string().trim().optional(),
    is_system: z.boolean(),
    description: z.string().trim().max(500, "Mo ta qua dai").optional(),
  })
  .superRefine((values, ctx) => {
    if (values.scope_type !== "global" && !values.scope_id?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Scope ID la bat buoc",
        path: ["scope_id"],
      })
    }
  })

const valueFormSchema = z
  .object({
    code: z.string().trim().min(1, "Ma gia tri la bat buoc").max(64, "Ma gia tri qua dai"),
    name: z.string().trim().min(1, "Ten hien thi la bat buoc").max(255, "Ten hien thi qua dai"),
    sort_order: z.coerce.number().int("Thu tu phai la so nguyen").min(0, "Thu tu khong duoc am"),
    is_active: z.boolean(),
    metadata: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.metadata?.trim()) {
      try {
        JSON.parse(values.metadata)
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Metadata JSON khong hop le",
          path: ["metadata"],
        })
      }
    }
  })

type CategoryFormValues = z.infer<typeof categoryFormSchema>
type ValueFormValues = z.infer<typeof valueFormSchema>

const categoryDefaultValues: CategoryFormValues = {
  code: "",
  name: "",
  scope_type: "global",
  scope_id: "",
  is_system: false,
  description: "",
}

const valueDefaultValues: ValueFormValues = {
  code: "",
  name: "",
  sort_order: 0,
  is_active: true,
  metadata: "",
}

function toCategoryFormValues(item: LookupCategory): CategoryFormValues {
  return {
    code: item.code,
    name: item.name,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    is_system: item.is_system,
    description: item.description || "",
  }
}

function toValueFormValues(item: LookupValue): ValueFormValues {
  return {
    code: item.code,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
    metadata: item.metadata || "",
  }
}

export function LookupsPage() {
  const [categories, setCategories] = useState<LookupCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<LookupCategory | null>(null)
  const [values, setValues] = useState<LookupValue[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingValues, setLoadingValues] = useState(false)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<LookupCategory | null>(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState<LookupCategory | null>(null)
  const [valDialogOpen, setValDialogOpen] = useState(false)
  const [editingVal, setEditingVal] = useState<LookupValue | null>(null)
  const [deleteValTarget, setDeleteValTarget] = useState<LookupValue | null>(null)
  const {
    control: catControl,
    formState: { errors: catErrors, isSubmitting: isCatSubmitting },
    handleSubmit: handleCatSubmit,
    register: registerCat,
    reset: resetCat,
    setValue: setCatValue,
    watch: watchCat,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryDefaultValues,
  })
  const {
    control: valControl,
    formState: { errors: valErrors, isSubmitting: isValSubmitting },
    handleSubmit: handleValSubmit,
    register: registerVal,
    reset: resetVal,
  } = useForm<ValueFormValues>({
    resolver: zodResolver(valueFormSchema),
    defaultValues: valueDefaultValues,
  })
  const catScopeType = watchCat("scope_type")

  const loadCategories = async () => {
    setLoadingCats(true)
    try {
      const data = await platformApi.listLookupCategories()
      setCategories(data)
      if (data.length > 0 && !selectedCat) {
        setSelectedCat(data[0])
      }
    } catch (err) {
      notify.error("Khong the tai danh muc he thong", translateApiError(err))
    } finally {
      setLoadingCats(false)
    }
  }

  const loadValues = async (catCode: string) => {
    setLoadingValues(true)
    try {
      const data = await platformApi.listLookupValues(catCode)
      setValues(data)
    } catch (err) {
      notify.error("Khong the tai danh sach gia tri", translateApiError(err))
    } finally {
      setLoadingValues(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCat) {
      loadValues(selectedCat.code)
    } else {
      setValues([])
    }
  }, [selectedCat])

  const openCreateCat = () => {
    setEditingCat(null)
    resetCat(categoryDefaultValues)
    setCatDialogOpen(true)
  }

  const openEditCat = (cat: LookupCategory, event: MouseEvent) => {
    event.stopPropagation()
    setEditingCat(cat)
    resetCat(toCategoryFormValues(cat))
    setCatDialogOpen(true)
  }

  const handleCatDialogOpenChange = (open: boolean) => {
    setCatDialogOpen(open)
    if (!open) {
      setEditingCat(null)
      resetCat(categoryDefaultValues)
    }
  }

  const submitCategory = handleCatSubmit(async (formValues) => {
    try {
      const payload: Partial<LookupCategory> = {
        code: formValues.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: formValues.name.trim(),
        scope_type: formValues.scope_type,
        scope_id: formValues.scope_id?.trim() || undefined,
        is_system: formValues.is_system,
        description: formValues.description?.trim() || undefined,
      }
      if (editingCat) {
        payload.id = editingCat.id
      }
      const saved = await platformApi.upsertLookupCategory(payload)
      notify.success("Luu danh muc thanh cong")
      setCatDialogOpen(false)
      resetCat(categoryDefaultValues)
      await loadCategories()
      setSelectedCat(saved)
    } catch (err) {
      notify.error("Luu danh muc that bai", translateApiError(err))
    }
  })

  const handleCatDelete = async () => {
    if (!deleteCatTarget) return
    try {
      await platformApi.deleteLookupCategory(deleteCatTarget.id)
      notify.success("Xoa danh muc thanh cong")
      if (selectedCat?.id === deleteCatTarget.id) {
        setSelectedCat(null)
      }
      setDeleteCatTarget(null)
      await loadCategories()
    } catch (err) {
      notify.error("Xoa danh muc that bai", translateApiError(err))
    }
  }

  const openCreateVal = () => {
    if (!selectedCat) return
    setEditingVal(null)
    resetVal({
      ...valueDefaultValues,
      sort_order: values.length * 10 + 10,
    })
    setValDialogOpen(true)
  }

  const openEditVal = (value: LookupValue) => {
    setEditingVal(value)
    resetVal(toValueFormValues(value))
    setValDialogOpen(true)
  }

  const handleValDialogOpenChange = (open: boolean) => {
    setValDialogOpen(open)
    if (!open) {
      setEditingVal(null)
      resetVal(valueDefaultValues)
    }
  }

  const submitValue = handleValSubmit(async (formValues) => {
    if (!selectedCat) return
    try {
      const payload: Partial<LookupValue> = {
        code: formValues.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: formValues.name.trim(),
        sort_order: formValues.sort_order,
        is_active: formValues.is_active,
        metadata: formValues.metadata?.trim() || undefined,
      }
      if (editingVal) {
        payload.id = editingVal.id
        payload.category_id = editingVal.category_id
      }
      await platformApi.upsertLookupValue(selectedCat.code, payload)
      notify.success("Luu gia tri danh muc thanh cong")
      setValDialogOpen(false)
      resetVal(valueDefaultValues)
      await loadValues(selectedCat.code)
    } catch (err) {
      notify.error("Luu gia tri that bai", translateApiError(err))
    }
  })

  const handleValDelete = async () => {
    if (!deleteValTarget || !selectedCat) return
    try {
      await platformApi.deleteLookupValue(deleteValTarget.id)
      notify.success("Xoa gia tri thanh cong")
      setDeleteValTarget(null)
      await loadValues(selectedCat.code)
    } catch (err) {
      notify.error("Xoa gia tri that bai", translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Danh muc he thong</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Lookups
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex h-[600px] flex-col overflow-hidden rounded-2xl border-muted/50 shadow-sm md:col-span-1">
          <CardContent className="flex h-full flex-col p-0">
            <div className="flex items-center justify-between border-b border-muted bg-muted/5 p-4">
              <span className="text-sm font-bold text-foreground">Loai danh muc</span>
              <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs font-semibold" onClick={openCreateCat}>
                <Plus className="size-3" /> Them moi
              </Button>
            </div>

            <div className="flex-1 divide-y divide-muted/30 overflow-y-auto">
              {loadingCats ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Dang tai danh muc...</div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Chua co danh muc nao.</div>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCat?.id === cat.id
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCat(cat)}
                      className={`flex cursor-pointer items-center justify-between p-4 transition-all hover:bg-muted/10 ${
                        isSelected ? "border-r-2 border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="max-w-[70%] space-y-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                          <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className={isSelected ? "text-primary" : "text-foreground"}>{cat.name}</span>
                        </div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">{cat.code}</div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100">
                        <Button size="icon" variant="ghost" className="size-6" onClick={(event) => openEditCat(cat, event)}>
                          <Edit2 className="size-3" />
                        </Button>
                        {!cat.is_system && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-destructive"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeleteCatTarget(cat)
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                        <ChevronRight className="ml-1 size-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-[600px] flex-col overflow-hidden rounded-2xl border-muted/50 shadow-sm md:col-span-2">
          <CardContent className="flex h-full flex-col p-0">
            <div className="flex items-center justify-between border-b border-muted bg-muted/5 p-4">
              <div>
                <span className="text-sm font-bold text-foreground">
                  Gia tri cua: <span className="text-primary">{selectedCat ? selectedCat.name : "..."}</span>
                </span>
                {selectedCat?.description && <p className="mt-1 text-xs font-normal text-muted-foreground">{selectedCat.description}</p>}
              </div>
              <Button size="sm" disabled={!selectedCat} className="h-7 gap-1.5 px-3.5 text-xs font-semibold" onClick={openCreateVal}>
                <Plus className="size-3.5" /> Them gia tri
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingValues ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Dang tai gia tri...</div>
              ) : !selectedCat ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Chon danh muc o ben trai de quan ly gia tri.</div>
              ) : values.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Danh muc nay chua co gia tri nao.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Ma</TableHead>
                      <TableHead>Ten hien thi</TableHead>
                      <TableHead>Sap xep</TableHead>
                      <TableHead>Trang thai</TableHead>
                      <TableHead className="pr-6 text-right">Thao tac</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {values.map((value) => (
                      <TableRow key={value.id}>
                        <TableCell className="pl-6 font-mono text-xs text-primary">{value.code}</TableCell>
                        <TableCell className="font-semibold">{value.name}</TableCell>
                        <TableCell className="font-mono text-xs">{value.sort_order}</TableCell>
                        <TableCell>
                          <Status variant={value.is_active ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{value.is_active ? "Bat" : "Tat"}</StatusLabel>
                          </Status>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditVal(value)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteValTarget(value)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={handleCatDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Cap nhat danh muc" : "Them danh muc moi"}</DialogTitle>
            <DialogDescription>Nhom danh muc phan loai du lieu he thong.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitCategory} className="space-y-4 py-2">
            <FormField label="Ma danh muc" htmlFor="cat_code" error={catErrors.code?.message}>
              <Input
                id="cat_code"
                placeholder="DOC_TYPE"
                aria-invalid={Boolean(catErrors.code)}
                disabled={!!editingCat}
                className="font-mono uppercase"
                spellCheck={false}
                {...registerCat("code", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                  },
                })}
              />
            </FormField>
            <FormField label="Ten danh muc" htmlFor="cat_name" error={catErrors.name?.message}>
              <Input
                id="cat_name"
                placeholder="Loai tai lieu"
                aria-invalid={Boolean(catErrors.name)}
                spellCheck={false}
                {...registerCat("name")}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Pham vi hieu luc" htmlFor="cat_scope_type" error={catErrors.scope_type?.message}>
                <Controller
                  control={catControl}
                  name="scope_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        setCatValue("scope_id", "", { shouldDirty: true, shouldValidate: true })
                      }}
                    >
                      <SelectTrigger id="cat_scope_type" aria-invalid={Boolean(catErrors.scope_type)}>
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
              {catScopeType !== "global" && (
                <FormField label="Ma pham vi" htmlFor="cat_scope_id" error={catErrors.scope_id?.message}>
                  <Input
                    id="cat_scope_id"
                    placeholder="Ma ID hieu luc"
                    aria-invalid={Boolean(catErrors.scope_id)}
                    spellCheck={false}
                    {...registerCat("scope_id")}
                  />
                </FormField>
              )}
            </div>
            <FormField label="Mo ta" htmlFor="cat_description" error={catErrors.description?.message}>
              <Input
                id="cat_description"
                placeholder="Mo ta cong dung cua nhom danh muc..."
                aria-invalid={Boolean(catErrors.description)}
                spellCheck={false}
                {...registerCat("description")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleCatDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isCatSubmitting}>
                {isCatSubmitting ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={valDialogOpen} onOpenChange={handleValDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVal ? "Cap nhat gia tri" : "Them gia tri danh muc"}</DialogTitle>
            <DialogDescription>Them cac lua chon chi tiet cho danh muc du lieu.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitValue} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ma gia tri" htmlFor="val_code" error={valErrors.code?.message}>
                <Input
                  id="val_code"
                  placeholder="ID_CARD"
                  aria-invalid={Boolean(valErrors.code)}
                  disabled={!!editingVal}
                  className="font-mono uppercase"
                  spellCheck={false}
                  {...registerVal("code", {
                    onChange: (event) => {
                      event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                    },
                  })}
                />
              </FormField>
              <FormField label="Ten hien thi" htmlFor="val_name" error={valErrors.name?.message}>
                <Input
                  id="val_name"
                  placeholder="Chung minh nhan dan"
                  aria-invalid={Boolean(valErrors.name)}
                  spellCheck={false}
                  {...registerVal("name")}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Thu tu sap xep" htmlFor="val_sort" error={valErrors.sort_order?.message}>
                <Input
                  id="val_sort"
                  type="number"
                  aria-invalid={Boolean(valErrors.sort_order)}
                  {...registerVal("sort_order", { valueAsNumber: true })}
                />
              </FormField>
              <Controller
                control={valControl}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id="val_active"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <label htmlFor="val_active" className="cursor-pointer select-none text-sm font-medium">
                      Kich hoat su dung
                    </label>
                  </div>
                )}
              />
            </div>

            <FormField label="Metadata cau hinh (JSON)" htmlFor="val_meta" error={valErrors.metadata?.message}>
              <Textarea
                id="val_meta"
                placeholder='{ "icon": "card-icon" }'
                className="font-mono"
                spellCheck={false}
                aria-invalid={Boolean(valErrors.metadata)}
                {...registerVal("metadata")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleValDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isValSubmitting}>
                {isValSubmitting ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCatTarget} onOpenChange={() => setDeleteCatTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa danh muc?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanh dong nay se xoa danh muc <strong>{deleteCatTarget?.name}</strong> cung toan bo cac gia tri con truc thuoc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction onClick={handleCatDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteValTarget} onOpenChange={() => setDeleteValTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa gia tri?</AlertDialogTitle>
            <AlertDialogDescription>
              Ban chac chan muon xoa gia tri <strong>{deleteValTarget?.name}</strong> khoi danh muc nay?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction onClick={handleValDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
