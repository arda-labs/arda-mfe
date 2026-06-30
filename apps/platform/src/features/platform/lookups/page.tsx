import { useEffect, useState } from "react"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { LookupCategory, LookupValue } from "../api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Textarea } from "@workspace/ui/components/textarea"
import { Plus, Edit2, Trash2, Tag, ChevronRight } from "lucide-react"

const SCOPE_TYPES = [
  { value: "global", label: "Toàn cục (Global)" },
  { value: "tenant", label: "Khách hàng (Tenant)" },
  { value: "org", label: "Tổ chức (Organization)" },
  { value: "branch", label: "Chi nhánh (Branch)" },
  { value: "department", label: "Phòng ban (Department)" },
]

export function LookupsPage() {
  const [categories, setCategories] = useState<LookupCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<LookupCategory | null>(null)
  const [values, setValues] = useState<LookupValue[]>([])

  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingValues, setLoadingValues] = useState(false)

  // Category Dialog States
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<LookupCategory | null>(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState<LookupCategory | null>(null)
  const [catForm, setCatForm] = useState({
    code: "",
    name: "",
    scope_type: "global" as any,
    scope_id: "",
    is_system: false,
    description: "",
  })

  // Value Dialog States
  const [valDialogOpen, setValDialogOpen] = useState(false)
  const [editingVal, setEditingVal] = useState<LookupValue | null>(null)
  const [deleteValTarget, setDeleteValTarget] = useState<LookupValue | null>(null)
  const [valForm, setValForm] = useState({
    code: "",
    name: "",
    sort_order: 0,
    is_active: true,
    metadata: "",
  })

  const [submitting, setSubmitting] = useState(false)

  const loadCategories = async () => {
    setLoadingCats(true)
    try {
      const data = await platformApi.listLookupCategories()
      setCategories(data)
      if (data.length > 0 && !selectedCat) {
        setSelectedCat(data[0])
      }
    } catch (err) {
      notify.error("Không thể tải danh mục hệ thống", translateApiError(err))
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
      notify.error("Không thể tải danh sách giá trị", translateApiError(err))
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

  // Category Handlers
  const openCreateCat = () => {
    setEditingCat(null)
    setCatForm({
      code: "",
      name: "",
      scope_type: "global",
      scope_id: "",
      is_system: false,
      description: "",
    })
    setCatDialogOpen(true)
  }

  const openEditCat = (cat: LookupCategory, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCat(cat)
    setCatForm({
      code: cat.code,
      name: cat.name,
      scope_type: cat.scope_type,
      scope_id: cat.scope_id || "",
      is_system: cat.is_system,
      description: cat.description || "",
    })
    setCatDialogOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catForm.code.trim() || !catForm.name.trim()) {
      notify.error("Mã và tên danh mục không được trống")
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<LookupCategory> = {
        code: catForm.code.trim(),
        name: catForm.name.trim(),
        scope_type: catForm.scope_type,
        scope_id: catForm.scope_id.trim() || undefined,
        is_system: catForm.is_system,
        description: catForm.description.trim() || undefined,
      }
      if (editingCat) {
        payload.id = editingCat.id
      }
      const saved = await platformApi.upsertLookupCategory(payload)
      notify.success("Lưu danh mục thành công")
      setCatDialogOpen(false)
      loadCategories()
      setSelectedCat(saved)
    } catch (err) {
      notify.error("Lưu danh mục thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCatDelete = async () => {
    if (!deleteCatTarget) return
    try {
      await platformApi.deleteLookupCategory(deleteCatTarget.id)
      notify.success("Xóa danh mục thành công")
      if (selectedCat?.id === deleteCatTarget.id) {
        setSelectedCat(null)
      }
      setDeleteCatTarget(null)
      loadCategories()
    } catch (err) {
      notify.error("Xóa danh mục thất bại", translateApiError(err))
    }
  }

  // Value Handlers
  const openCreateVal = () => {
    if (!selectedCat) return
    setEditingVal(null)
    setValForm({
      code: "",
      name: "",
      sort_order: values.length * 10 + 10,
      is_active: true,
      metadata: "",
    })
    setValDialogOpen(true)
  }

  const openEditVal = (val: LookupValue) => {
    setEditingVal(val)
    setValForm({
      code: val.code,
      name: val.name,
      sort_order: val.sort_order,
      is_active: val.is_active,
      metadata: val.metadata || "",
    })
    setValDialogOpen(true)
  }

  const handleValSubmit = async () => {
    if (!selectedCat) return
    if (!valForm.code.trim() || !valForm.name.trim()) {
      notify.error("Mã và tên giá trị không được trống")
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<LookupValue> = {
        code: valForm.code.trim(),
        name: valForm.name.trim(),
        sort_order: Number(valForm.sort_order),
        is_active: valForm.is_active,
        metadata: valForm.metadata.trim() || undefined,
      }
      if (editingVal) {
        payload.id = editingVal.id
        payload.category_id = editingVal.category_id
      }
      await platformApi.upsertLookupValue(selectedCat.code, payload)
      notify.success("Lưu giá trị danh mục thành công")
      setValDialogOpen(false)
      loadValues(selectedCat.code)
    } catch (err) {
      notify.error("Lưu giá trị thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleValDelete = async () => {
    if (!deleteValTarget || !selectedCat) return
    try {
      await platformApi.deleteLookupValue(deleteValTarget.id)
      notify.success("Xóa giá trị thành công")
      setDeleteValTarget(null)
      loadValues(selectedCat.code)
    } catch (err) {
      notify.error("Xóa giá trị thất bại", translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-xl">Danh mục hệ thống</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
            Lookups
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Categories List */}
        <Card className="md:col-span-1 border-muted/50 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[600px]">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-4 border-b border-muted flex items-center justify-between bg-muted/5">
              <span className="font-bold text-sm text-foreground">Loại danh mục</span>
              <Button size="sm" variant="outline" className="h-7 px-2 font-semibold text-xs gap-1" onClick={openCreateCat}>
                <Plus className="size-3" /> Thêm mới
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-muted/30">
              {loadingCats ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Đang tải danh mục...</div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Chưa có danh mục nào.</div>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCat?.id === cat.id
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCat(cat)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-muted/10 ${
                        isSelected ? "bg-primary/5 border-r-2 border-primary" : ""
                      }`}
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                          <Tag className="size-3.5 text-muted-foreground shrink-0" />
                          <span className={isSelected ? "text-primary" : "text-foreground"}>{cat.name}</span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">{cat.code}</div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100">
                        <Button size="icon" variant="ghost" className="size-6" onClick={(e) => openEditCat(cat, e)}>
                          <Edit2 className="size-3" />
                        </Button>
                        {!cat.is_system && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteCatTarget(cat)
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                        <ChevronRight className="size-3.5 text-muted-foreground ml-1" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Detail Values List */}
        <Card className="md:col-span-2 border-muted/50 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[600px]">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-4 border-b border-muted flex items-center justify-between bg-muted/5">
              <div>
                <span className="font-bold text-sm text-foreground">
                  Giá trị của: <span className="text-primary">{selectedCat ? selectedCat.name : "..."}</span>
                </span>
                {selectedCat?.description && (
                  <p className="text-xs text-muted-foreground font-normal mt-1">{selectedCat.description}</p>
                )}
              </div>
              <Button
                size="sm"
                disabled={!selectedCat}
                className="h-7 px-3.5 font-semibold text-xs gap-1.5"
                onClick={openCreateVal}
              >
                <Plus className="size-3.5" /> Thêm giá trị
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingValues ? (
                <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Đang tải giá trị...</div>
              ) : !selectedCat ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Chọn danh mục ở bên trái để quản lý giá trị.</div>
              ) : values.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Danh mục này chưa có giá trị nào. Nhấn nút Thêm để bắt đầu.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Mã</TableHead>
                      <TableHead>Tên hiển thị</TableHead>
                      <TableHead>Sắp xếp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right pr-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {values.map((val) => (
                      <TableRow key={val.id}>
                        <TableCell className="pl-6 font-mono text-xs text-primary">{val.code}</TableCell>
                        <TableCell className="font-semibold">{val.name}</TableCell>
                        <TableCell className="font-mono text-xs">{val.sort_order}</TableCell>
                        <TableCell>
                          <Status variant={val.is_active ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{val.is_active ? "Bật" : "Tắt"}</StatusLabel>
                          </Status>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditVal(val)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteValTarget(val)}>
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

      {/* Category Create/Edit Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Cập nhật danh mục" : "Thêm danh mục mới"}</DialogTitle>
            <DialogDescription>Nhóm danh mục phân loại dữ liệu hệ thống.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat_code">Mã danh mục</Label>
              <Input
                id="cat_code"
                placeholder="DOC_TYPE"
                value={catForm.code}
                onChange={(e) => setCatForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                disabled={!!editingCat}
                className="font-mono uppercase"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat_name">Tên danh mục</Label>
              <Input
                id="cat_name"
                placeholder="Loại tài liệu"
                value={catForm.name}
                onChange={(e) => setCatForm(p => ({ ...p, name: e.target.value }))}
                spellCheck={false}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat_scope_type">Phạm vi hiệu lực</Label>
                <Select
                  value={catForm.scope_type}
                  onValueChange={(val) => setCatForm(p => ({ ...p, scope_type: val as any }))}
                >
                  <SelectTrigger id="cat_scope_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_TYPES.map(scope => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {catForm.scope_type !== "global" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cat_scope_id">Mã phạm vi (Scope ID)</Label>
                  <Input
                    id="cat_scope_id"
                    placeholder="Mã ID hiệu lực"
                    value={catForm.scope_id}
                    onChange={(e) => setCatForm(p => ({ ...p, scope_id: e.target.value }))}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat_description">Mô tả</Label>
              <Input
                id="cat_description"
                placeholder="Mô tả công dụng của nhóm danh mục..."
                value={catForm.description}
                onChange={(e) => setCatForm(p => ({ ...p, description: e.target.value }))}
                spellCheck={false}
              />
            </div>
          </form>

          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCatSubmit} disabled={submitting}>
              Lưu lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Value Create/Edit Dialog */}
      <Dialog open={valDialogOpen} onOpenChange={setValDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVal ? "Cập nhật giá trị" : "Thêm giá trị danh mục"}</DialogTitle>
            <DialogDescription>Thêm các lựa chọn chi tiết cho danh mục dữ liệu.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="val_code">Mã giá trị</Label>
                <Input
                  id="val_code"
                  placeholder="ID_CARD"
                  value={valForm.code}
                  onChange={(e) => setValForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                  disabled={!!editingVal}
                  className="font-mono uppercase"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="val_name">Tên hiển thị</Label>
                <Input
                  id="val_name"
                  placeholder="Chứng minh nhân dân"
                  value={valForm.name}
                  onChange={(e) => setValForm(p => ({ ...p, name: e.target.value }))}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="val_sort">Thứ tự sắp xếp</Label>
                <Input
                  id="val_sort"
                  type="number"
                  value={valForm.sort_order}
                  onChange={(e) => setValForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="val_active"
                  checked={valForm.is_active}
                  onCheckedChange={(checked) => setValForm(p => ({ ...p, is_active: !!checked }))}
                />
                <Label htmlFor="val_active" className="select-none cursor-pointer">
                  Kích hoạt sử dụng
                </Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="val_meta">Metadata cấu hình (JSON)</Label>
              <Textarea
                id="val_meta"
                placeholder='{ "icon": "card-icon" }'
                value={valForm.metadata}
                onChange={(e) => setValForm(p => ({ ...p, metadata: e.target.value }))}
                className="font-mono"
                spellCheck={false}
              />
            </div>
          </form>

          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setValDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleValSubmit} disabled={submitting}>
              Lưu lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCatTarget} onOpenChange={() => setDeleteCatTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa danh mục?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa danh mục <strong>{deleteCatTarget?.name}</strong> cùng toàn bộ các giá trị con trực thuộc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleCatDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Value Confirmation */}
      <AlertDialog open={!!deleteValTarget} onOpenChange={() => setDeleteValTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa giá trị?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chắc chắn muốn xóa giá trị <strong>{deleteValTarget?.name}</strong> khỏi danh mục này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleValDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
