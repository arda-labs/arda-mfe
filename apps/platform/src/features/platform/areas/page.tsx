import { useEffect, useState } from "react"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { Area, GeoAdminUnit, LookupValue } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
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
import { Edit2, Plus, Search, Trash2 } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hiệu lực" },
] as const

const EMPTY_FORM = {
  code: "",
  name: "",
  area_type_code: "",
  parent_id: "",
  admin_unit_code: "",
  description: "",
  status: "active" as "active" | "inactive",
  effective_from: "",
  effective_to: "",
}

export function AreasPage() {
  const [items, setItems] = useState<Area[]>([])
  const [areaTypes, setAreaTypes] = useState<LookupValue[]>([])
  const [adminUnits, setAdminUnits] = useState<GeoAdminUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadDependencies = async () => {
    const [types, provinces, wards] = await Promise.all([
      platformApi.listLookupValues("AREA_TYPE").catch(() => []),
      platformApi.listGeoAdminUnits(undefined, 1).catch(() => []),
      platformApi.listGeoAdminUnits(undefined, 2).catch(() => []),
    ])
    setAreaTypes(types)
    setAdminUnits([...provinces, ...wards])
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listAreas({
        status: statusFilter === "all" ? undefined : statusFilter,
        areaTypeCode: typeFilter === "all" ? undefined : typeFilter,
        q: query.trim() || undefined,
      })
      setItems(data)
    } catch (err) {
      notify.error("Không thể tải danh sách khu vực", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDependencies()
  }, [])

  useEffect(() => {
    load()
  }, [statusFilter, typeFilter])

  const openCreate = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: Area) => {
    setEditingItem(item)
    setForm({
      code: item.code,
      name: item.name,
      area_type_code: item.area_type_code,
      parent_id: item.parent_id || "",
      admin_unit_code: item.admin_unit_code || "",
      description: item.description || "",
      status: item.status,
      effective_from: item.effective_from || "",
      effective_to: item.effective_to || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (
      !form.code.trim() ||
      !form.name.trim() ||
      !form.area_type_code ||
      !form.status
    ) {
      notify.error(
        "Mã khu vực, tên khu vực, loại khu vực và trạng thái là bắt buộc"
      )
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<Area> = {
        code: form.code.trim(),
        name: form.name.trim(),
        area_type_code: form.area_type_code,
        parent_id: form.parent_id || undefined,
        admin_unit_code: form.admin_unit_code || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
        effective_from: form.effective_from || undefined,
        effective_to: form.effective_to || undefined,
      }

      if (editingItem) {
        await platformApi.updateArea(editingItem.id, payload)
        notify.success("Cập nhật khu vực thành công")
      } else {
        await platformApi.createArea(payload)
        notify.success("Thêm khu vực thành công")
      }

      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu khu vực thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteArea(deleteTarget.id)
      notify.success("Ngừng hiệu lực khu vực thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error(
        "Cập nhật trạng thái khu vực thất bại",
        translateApiError(err)
      )
    }
  }

  const getAreaTypeLabel = (code: string) =>
    areaTypes.find((item) => item.code === code)?.name || code

  const getParentLabel = (parentId?: string) =>
    items.find((item) => item.id === parentId)?.name || "-"

  const getAdminUnitLabel = (code?: string) =>
    adminUnits.find((item) => item.code === code)?.name || code || "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Khu vực</h2>
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            Tổng số: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Thêm khu vực
        </Button>
      </div>

      <Card className="rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo mã, tên hoặc mô tả..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Loại khu vực" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại khu vực</SelectItem>
                {areaTypes.map((item) => (
                  <SelectItem key={item.id} value={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>
              Tìm kiếm
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu khu vực...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mã khu vực</TableHead>
                    <TableHead>Tên khu vực</TableHead>
                    <TableHead>Loại khu vực</TableHead>
                    <TableHead>Khu vực cha</TableHead>
                    <TableHead>Đơn vị hành chính</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Chưa có khu vực nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.code}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.description || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getAreaTypeLabel(item.area_type_code)}
                        </TableCell>
                        <TableCell>{getParentLabel(item.parent_id)}</TableCell>
                        <TableCell>
                          {getAdminUnitLabel(item.admin_unit_code)}
                        </TableCell>
                        <TableCell>
                          <Status
                            variant={
                              item.status === "active" ? "success" : "default"
                            }
                          >
                            <StatusIndicator />
                            <StatusLabel>
                              {item.status === "active"
                                ? "Hoạt động"
                                : "Ngừng hiệu lực"}
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Cập nhật khu vực" : "Thêm khu vực"}
            </DialogTitle>
            <DialogDescription>
              Quản lý khu vực nghiệp vụ với phân cấp cha con.
            </DialogDescription>
          </DialogHeader>

          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="area_code">Mã khu vực</Label>
                <Input
                  id="area_code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                    }))
                  }
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area_name">Tên khu vực</Label>
                <Input
                  id="area_name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="area_type_code">Loại khu vực</Label>
                <Select
                  value={form.area_type_code}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, area_type_code: value }))
                  }
                >
                  <SelectTrigger id="area_type_code">
                    <SelectValue placeholder="Chọn loại khu vực" />
                  </SelectTrigger>
                  <SelectContent>
                    {areaTypes.map((item) => (
                      <SelectItem key={item.id} value={item.code}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area_parent_id">Khu vực cha</Label>
                <Select
                  value={form.parent_id || "none"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      parent_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="area_parent_id">
                    <SelectValue placeholder="Không có" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có</SelectItem>
                    {items
                      .filter(
                        (item) => !editingItem || item.id !== editingItem.id
                      )
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area_admin_unit_code">Đơn vị hành chính</Label>
                <Select
                  value={form.admin_unit_code || "none"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      admin_unit_code: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="area_admin_unit_code">
                    <SelectValue placeholder="Không liên kết" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không liên kết</SelectItem>
                    {adminUnits.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="area_status">Trạng thái</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as Area["status"],
                    }))
                  }
                >
                  <SelectTrigger id="area_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hiệu lực</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area_effective_from">
                  Hiệu lực từ (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="area_effective_from"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_from}
                  onValueChange={(masked) =>
                    setForm((prev) => ({ ...prev, effective_from: masked }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area_effective_to">
                  Hiệu lực đến (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="area_effective_to"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_to}
                  onValueChange={(masked) =>
                    setForm((prev) => ({ ...prev, effective_to: masked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="area_description">Ghi chú / mô tả</Label>
              <Textarea
                id="area_description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Thông tin mô tả khu vực..."
              />
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
            <AlertDialogTitle>
              Xác nhận ngừng hiệu lực khu vực?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ chuyển khu vực{" "}
              <strong>{deleteTarget?.name}</strong> sang trạng thái ngừng hiệu
              lực.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
