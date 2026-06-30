import { useEffect, useState } from "react"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { CreditInstitution } from "../api"
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
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { Edit2, Plus, Search, Trash2 } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hiệu lực" },
] as const

type FormState = {
  code: string
  name: string
  address: string
  status: "active" | "inactive"
  effective_from: string
  short_name: string
  phone: string
  email: string
  license_no: string
  license_date: string
  tax_code: string
  website: string
  note: string
}

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  address: "",
  status: "active",
  effective_from: "",
  short_name: "",
  phone: "",
  email: "",
  license_no: "",
  license_date: "",
  tax_code: "",
  website: "",
  note: "",
}

export function CreditInstitutionsPage() {
  const [items, setItems] = useState<CreditInstitution[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditInstitution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditInstitution | null>(
    null
  )
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listCreditInstitutions({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: query.trim() || undefined,
      })
      setItems(data)
    } catch (err) {
      notify.error(
        "Không thể tải danh sách tổ chức tín dụng",
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const openCreate = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: CreditInstitution) => {
    setEditingItem(item)
    setForm({
      code: item.code,
      name: item.name,
      address: item.address,
      status: item.status,
      effective_from: item.effective_from || "",
      short_name: item.short_name || "",
      phone: item.phone || "",
      email: item.email || "",
      license_no: item.license_no || "",
      license_date: item.license_date || "",
      tax_code: item.tax_code || "",
      website: item.website || "",
      note: item.note || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (
      !form.code.trim() ||
      !form.name.trim() ||
      !form.address.trim() ||
      !form.status
    ) {
      notify.error("Mã tổ chức, tên tổ chức, địa chỉ và trạng thái là bắt buộc")
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<CreditInstitution> = {
        code: form.code.trim(),
        name: form.name.trim(),
        address: form.address.trim(),
        status: form.status,
        effective_from: form.effective_from || undefined,
        short_name: form.short_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        license_no: form.license_no.trim() || undefined,
        license_date: form.license_date || undefined,
        tax_code: form.tax_code.trim() || undefined,
        website: form.website.trim() || undefined,
        note: form.note.trim() || undefined,
      }

      if (editingItem) {
        await platformApi.updateCreditInstitution(editingItem.id, payload)
        notify.success("Cập nhật tổ chức tín dụng thành công")
      } else {
        await platformApi.createCreditInstitution(payload)
        notify.success("Thêm tổ chức tín dụng thành công")
      }

      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu tổ chức tín dụng thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteCreditInstitution(deleteTarget.id)
      notify.success("Xóa tổ chức tín dụng thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error("Xóa tổ chức tín dụng thất bại", translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">
            Tổ chức tín dụng
          </h2>
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-bold"
          >
            Tổng số: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Thêm tổ chức
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
                placeholder="Tìm theo mã, tên, MST, số giấy phép..."
                className="pl-9"
              />
            </div>
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
              Đang tải dữ liệu tổ chức tín dụng...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mã tổ chức</TableHead>
                    <TableHead>Tên tổ chức</TableHead>
                    <TableHead>Tên viết tắt</TableHead>
                    <TableHead>Số giấy phép</TableHead>
                    <TableHead>Mã số thuế</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hiệu lực</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Chưa có tổ chức tín dụng nào.
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
                              {item.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.short_name || "-"}</TableCell>
                        <TableCell>{item.license_no || "-"}</TableCell>
                        <TableCell>{item.tax_code || "-"}</TableCell>
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
                        <TableCell>{item.effective_from || "-"}</TableCell>
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
              {editingItem
                ? "Cập nhật tổ chức tín dụng"
                : "Thêm tổ chức tín dụng"}
            </DialogTitle>
            <DialogDescription>
              Quản lý danh mục tổ chức tín dụng dùng chung cho hệ thống.
            </DialogDescription>
          </DialogHeader>

          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">Mã tổ chức *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="BIDV"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên tổ chức *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ngân hàng thương mại cổ phần ..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address">Địa chỉ *</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Địa chỉ trụ sở"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Trạng thái *</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as FormState["status"],
                    }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hiệu lực</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="effective_from">Hiệu lực (MM/DD/YYYY)</Label>
                <MaskInput
                  id="effective_from"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.effective_from}
                  onValueChange={(masked) =>
                    setForm((prev) => ({
                      ...prev,
                      effective_from: masked,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="short_name">Tên viết tắt</Label>
                <Input
                  id="short_name"
                  value={form.short_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, short_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_no">Số giấy phép</Label>
                <Input
                  id="license_no"
                  value={form.license_no}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, license_no: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_date">Ngày cấp (MM/DD/YYYY)</Label>
                <MaskInput
                  id="license_date"
                  mask="date"
                  className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                  value={form.license_date}
                  onValueChange={(masked) =>
                    setForm((prev) => ({
                      ...prev,
                      license_date: masked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tax_code">Mã số thuế</Label>
                <Input
                  id="tax_code"
                  value={form.tax_code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tax_code: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Thông tin bổ sung..."
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
            <AlertDialogTitle>Xác nhận xóa tổ chức tín dụng?</AlertDialogTitle>
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
