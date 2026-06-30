import { useEffect, useState } from "react"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { LookupValue } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Edit2, Plus, Trash2 } from "lucide-react"

const CATEGORY_CODE = "AREA_TYPE"

export function AreaTypesPage() {
  const [items, setItems] = useState<LookupValue[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LookupValue | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LookupValue | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    code: "",
    name: "",
    sort_order: 10,
    is_active: true,
  })

  const ensureCategory = async () => {
    await platformApi.upsertLookupCategory({
      code: CATEGORY_CODE,
      name: "Loại khu vực",
      scope_type: "global",
      is_system: false,
      description: "Danh mục loại khu vực",
    })
  }

  const load = async () => {
    setLoading(true)
    try {
      await ensureCategory()
      const data = await platformApi.listLookupValues(CATEGORY_CODE)
      setItems(data)
    } catch (err) {
      notify.error(
        "Không thể tải danh sách loại khu vực",
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingItem(null)
    setForm({
      code: "",
      name: "",
      sort_order: items.length * 10 + 10,
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (item: LookupValue) => {
    setEditingItem(item)
    setForm({
      code: item.code,
      name: item.name,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error("Mã loại khu vực và tên loại khu vực là bắt buộc")
      return
    }

    setSubmitting(true)
    try {
      await ensureCategory()
      const payload: Partial<LookupValue> = {
        code: form.code.trim(),
        name: form.name.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      if (editingItem) {
        payload.id = editingItem.id
        payload.category_id = editingItem.category_id
      }
      await platformApi.upsertLookupValue(CATEGORY_CODE, payload)
      notify.success("Lưu loại khu vực thành công")
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu loại khu vực thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteLookupValue(deleteTarget.id)
      notify.success("Xóa loại khu vực thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error("Xóa loại khu vực thất bại", translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Loại khu vực</h2>
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            Tổng số: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Thêm loại khu vực
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu loại khu vực...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mã loại</TableHead>
                  <TableHead>Tên loại</TableHead>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Chưa có loại khu vực nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sort_order}</TableCell>
                      <TableCell>
                        <Status
                          variant={item.is_active ? "success" : "default"}
                        >
                          <StatusIndicator />
                          <StatusLabel>
                            {item.is_active ? "Hoạt động" : "Ngừng hiệu lực"}
                          </StatusLabel>
                        </Status>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Cập nhật loại khu vực" : "Thêm loại khu vực"}
            </DialogTitle>
            <DialogDescription>
              Quản lý danh mục loại khu vực dùng chung.
            </DialogDescription>
          </DialogHeader>
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="area_type_code">Mã loại khu vực</Label>
              <Input
                id="area_type_code"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  }))
                }
                disabled={!!editingItem}
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area_type_name">Tên loại khu vực</Label>
              <Input
                id="area_type_name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="area_type_sort">Thứ tự</Label>
                <Input
                  id="area_type_sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <Checkbox
                  id="area_type_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_active: !!checked }))
                  }
                />
                <Label
                  htmlFor="area_type_active"
                  className="cursor-pointer select-none"
                >
                  Đang hoạt động
                </Label>
              </div>
            </div>
          </form>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa loại khu vực?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chắc chắn muốn xóa <strong>{deleteTarget?.name}</strong> khỏi
              danh mục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              Xóa bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
