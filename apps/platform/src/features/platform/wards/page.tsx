import { useEffect, useState } from "react"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { GeoAdminUnit } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Edit2, Plus } from "lucide-react"

const EMPTY_FORM = {
  code: "",
  name: "",
  full_name: "",
  parent_code: "",
  unit_type: "ward",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

export function WardsPage() {
  const [items, setItems] = useState<GeoAdminUnit[]>([])
  const [provinces, setProvinces] = useState<GeoAdminUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    try {
      const provinceData = await platformApi.listGeoAdminUnits(undefined, 1)
      setProvinces(provinceData)

      const wardData =
        selectedProvince === "all"
          ? await platformApi.listGeoAdminUnits(undefined, 2)
          : await platformApi.listGeoAdminUnits(selectedProvince, 2)
      setItems(wardData)
    } catch (err) {
      notify.error("Không thể tải danh sách phường xã", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedProvince])

  const openCreate = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: GeoAdminUnit) => {
    setEditingItem(item)
    setForm({
      code: item.code,
      name: item.name,
      full_name: item.full_name || "",
      parent_code: item.parent_code || "",
      unit_type: item.unit_type || "ward",
      country_code: item.country_code || "VN",
      region_code: item.region_code || "",
      effective_from: item.effective_from || "",
      effective_to: item.effective_to || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.parent_code) {
      notify.error("Mã phường xã, tên phường xã và tỉnh thành là bắt buộc")
      return
    }

    setSubmitting(true)
    try {
      await platformApi.upsertGeoAdminUnit({
        code: form.code.trim(),
        name: form.name.trim(),
        full_name: form.full_name.trim() || undefined,
        parent_code: form.parent_code,
        level: 2,
        unit_type: form.unit_type.trim(),
        country_code: form.country_code.trim() || "VN",
        region_code: form.region_code.trim() || undefined,
        effective_from: form.effective_from || undefined,
        effective_to: form.effective_to || undefined,
        is_active: true,
      })
      notify.success(
        editingItem
          ? "Cập nhật phường xã thành công"
          : "Thêm phường xã thành công"
      )
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu phường xã thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Phường xã</h2>
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            Tổng số: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Thêm phường xã
        </Button>
      </div>

      <Card className="rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Select
                value={selectedProvince}
                onValueChange={setSelectedProvince}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tỉnh thành" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tỉnh thành</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province.code} value={province.code}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu phường xã...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên phường xã</TableHead>
                    <TableHead>Tỉnh thành</TableHead>
                    <TableHead>Loại đơn vị</TableHead>
                    <TableHead>Hiệu lực từ</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Chưa có phường xã nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.code}>
                        <TableCell className="font-mono text-xs">
                          {item.code}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.full_name || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {provinces.find((p) => p.code === item.parent_code)
                            ?.name ||
                            item.parent_code ||
                            "-"}
                        </TableCell>
                        <TableCell>{item.unit_type}</TableCell>
                        <TableCell>{item.effective_from || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
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
              {editingItem ? "Cập nhật phường xã" : "Thêm phường xã"}
            </DialogTitle>
            <DialogDescription>
              Quản lý đơn vị địa giới hành chính cấp phường/xã.
            </DialogDescription>
          </DialogHeader>
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ward_code">Mã phường xã</Label>
                <Input
                  id="ward_code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ward_name">Tên phường xã</Label>
                <Input
                  id="ward_name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="ward_full_name">Tên đầy đủ</Label>
                <Input
                  id="ward_full_name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ward_parent">Tỉnh thành</Label>
                <Select
                  value={form.parent_code}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, parent_code: value }))
                  }
                >
                  <SelectTrigger id="ward_parent">
                    <SelectValue placeholder="Chọn tỉnh thành" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province.code} value={province.code}>
                        {province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ward_unit_type">Loại đơn vị</Label>
                <Input
                  id="ward_unit_type"
                  value={form.unit_type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unit_type: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ward_region_code">Mã vùng</Label>
                <Input
                  id="ward_region_code"
                  value={form.region_code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      region_code: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ward_effective_from">
                  Hiệu lực từ (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="ward_effective_from"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_from}
                  onValueChange={(masked) =>
                    setForm((prev) => ({ ...prev, effective_from: masked }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ward_effective_to">
                  Hiệu lực đến (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="ward_effective_to"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_to}
                  onValueChange={(masked) =>
                    setForm((prev) => ({ ...prev, effective_to: masked }))
                  }
                />
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
    </div>
  )
}
