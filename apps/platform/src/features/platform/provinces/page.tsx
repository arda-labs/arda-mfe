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
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Edit2, Plus } from "lucide-react"

const EMPTY_FORM = {
  code: "",
  name: "",
  full_name: "",
  unit_type: "province",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

export function ProvincesPage() {
  const [items, setItems] = useState<GeoAdminUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listGeoAdminUnits(undefined, 1)
      setItems(data)
    } catch (err) {
      notify.error("Không thể tải danh sách tỉnh thành", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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
      unit_type: item.unit_type || "province",
      country_code: item.country_code || "VN",
      region_code: item.region_code || "",
      effective_from: item.effective_from || "",
      effective_to: item.effective_to || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error("Mã tỉnh thành và tên tỉnh thành là bắt buộc")
      return
    }

    setSubmitting(true)
    try {
      await platformApi.upsertGeoAdminUnit({
        code: form.code.trim(),
        name: form.name.trim(),
        full_name: form.full_name.trim() || undefined,
        level: 1,
        unit_type: form.unit_type.trim(),
        country_code: form.country_code.trim() || "VN",
        region_code: form.region_code.trim() || undefined,
        effective_from: form.effective_from || undefined,
        effective_to: form.effective_to || undefined,
        is_active: true,
      })
      notify.success(
        editingItem
          ? "Cập nhật tỉnh thành thành công"
          : "Thêm tỉnh thành thành công"
      )
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu tỉnh thành thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Tỉnh thành</h2>
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            Tổng số: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Thêm tỉnh thành
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu tỉnh thành...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên tỉnh thành</TableHead>
                  <TableHead>Tên đầy đủ</TableHead>
                  <TableHead>Loại đơn vị</TableHead>
                  <TableHead>Vùng</TableHead>
                  <TableHead>Hiệu lực</TableHead>
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
                      Chưa có tỉnh thành nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono text-xs">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.full_name || "-"}</TableCell>
                      <TableCell>{item.unit_type}</TableCell>
                      <TableCell>{item.region_code || "-"}</TableCell>
                      <TableCell>
                        <Status variant="success">
                          <StatusIndicator />
                          <StatusLabel>
                            {item.effective_from || "Đang hiệu lực"}
                          </StatusLabel>
                        </Status>
                      </TableCell>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Cập nhật tỉnh thành" : "Thêm tỉnh thành"}
            </DialogTitle>
            <DialogDescription>
              Quản lý đơn vị địa giới hành chính cấp tỉnh/thành.
            </DialogDescription>
          </DialogHeader>
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="province_code">Mã tỉnh thành</Label>
                <Input
                  id="province_code"
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
                <Label htmlFor="province_name">Tên tỉnh thành</Label>
                <Input
                  id="province_name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="province_full_name">Tên đầy đủ</Label>
                <Input
                  id="province_full_name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province_unit_type">Loại đơn vị</Label>
                <Input
                  id="province_unit_type"
                  value={form.unit_type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unit_type: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="province_country">Mã quốc gia</Label>
                <Input
                  id="province_country"
                  value={form.country_code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      country_code: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province_region">Mã vùng</Label>
                <Input
                  id="province_region"
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
                <Label htmlFor="province_effective_from">
                  Hiệu lực từ (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="province_effective_from"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_from}
                  onValueChange={(masked) =>
                    setForm((prev) => ({ ...prev, effective_from: masked }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province_effective_to">
                  Hiệu lực đến (MM/DD/YYYY)
                </Label>
                <MaskInput
                  id="province_effective_to"
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
