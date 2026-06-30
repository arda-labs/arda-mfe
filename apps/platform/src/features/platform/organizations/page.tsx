import { useEffect, useState } from "react"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { Organization } from "../api"
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
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Building2, Plus, Edit2, Trash2, FolderTree, List } from "lucide-react"

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "tree">("list")

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    code: "",
    name: "",
    parent_id: "",
    address: "",
    is_active: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listOrganizations()
      setOrgs(data)
    } catch (err) {
      notify.error("Không thể tải danh sách đơn vị", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingOrg(null)
    setForm({
      code: "",
      name: "",
      parent_id: "",
      address: "",
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (org: Organization) => {
    setEditingOrg(org)
    setForm({
      code: org.code,
      name: org.name,
      parent_id: org.parent_id || "",
      address: org.address || "",
      is_active: org.is_active,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error("Mã và tên đơn vị không được để trống")
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Organization> = {
        code: form.code.trim(),
        name: form.name.trim(),
        parent_id: form.parent_id || undefined,
        address: form.address.trim() || undefined,
        is_active: form.is_active,
      }

      if (editingOrg) {
        await platformApi.updateOrganization(editingOrg.id, payload)
        notify.success("Cập nhật đơn vị thành công")
      } else {
        await platformApi.createOrganization(payload)
        notify.success("Thêm đơn vị thành công")
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu đơn vị thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteOrganization(deleteTarget.id)
      notify.success("Xóa đơn vị thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error("Xóa đơn vị thất bại", translateApiError(err))
    }
  }

  const renderTree = (parent_id: string | undefined = undefined, depth = 0) => {
    const children = orgs.filter(o => o.parent_id === parent_id)
    if (children.length === 0) return null

    return (
      <div className={`space-y-2 ${depth > 0 ? "pl-6 border-l border-muted/80 ml-3 mt-2" : ""}`}>
        {children.map(org => (
          <div key={org.id} className="group">
            <div className="flex items-center justify-between p-3 rounded-xl border border-muted/60 bg-muted/10 hover:bg-muted/20 transition-all">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-primary/70" />
                <div>
                  <span className="font-semibold text-sm">{org.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">({org.code})</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(org)}>
                  <Edit2 className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(org)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {renderTree(org.id, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-xl">Đơn vị & Tổ chức</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
            Tổng số: {orgs.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-input p-0.5 bg-background">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-md"
              onClick={() => setViewMode("list")}
            >
              <List className="size-3.5 mr-1" /> Danh sách
            </Button>
            <Button
              variant={viewMode === "tree" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-md"
              onClick={() => setViewMode("tree")}
            >
              <FolderTree className="size-3.5 mr-1" /> Sơ đồ cây
            </Button>
          </div>
          <Button onClick={openCreate} className="h-9 px-4 font-semibold text-sm gap-1.5">
            <Plus className="size-4" /> Thêm đơn vị
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Đang tải dữ liệu đơn vị...
        </div>
      ) : viewMode === "tree" ? (
        <Card className="border-muted/50 rounded-2xl shadow-sm">
          <CardContent className="p-6">
            {renderTree(undefined)}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted/50 rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Mã đơn vị</TableHead>
                  <TableHead>Tên đơn vị</TableHead>
                  <TableHead>Đơn vị cấp trên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chưa có đơn vị nào được tạo.
                    </TableCell>
                  </TableRow>
                ) : (
                  orgs.map((org) => {
                    const parent = orgs.find(o => o.id === org.parent_id)
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-mono text-xs">{org.code}</TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {parent ? parent.name : "—"}
                        </TableCell>
                        <TableCell>
                          <Status variant={org.is_active ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{org.is_active ? "Hoạt động" : "Tạm ngưng"}</StatusLabel>
                          </Status>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(org)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(org)}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Cập nhật đơn vị" : "Thêm đơn vị mới"}</DialogTitle>
            <DialogDescription>
              Nhập các thông tin cấu trúc tổ chức hoặc đơn vị dưới đây.
            </DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Mã đơn vị</Label>
                <Input
                  id="code"
                  placeholder="ORG_01"
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingOrg}
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên đơn vị</Label>
                <Input
                  id="name"
                  placeholder="Văn phòng đại diện"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent_id">Đơn vị cấp trên</Label>
              <Select
                value={form.parent_id}
                onValueChange={(val) => setForm(p => ({ ...p, parent_id: val }))}
              >
                <SelectTrigger id="parent_id">
                  <SelectValue placeholder="— Không có —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Không có —</SelectItem>
                  {orgs
                    .filter(o => !editingOrg || o.id !== editingOrg.id)
                    .map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                placeholder="Địa chỉ trụ sở"
                value={form.address}
                onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                spellCheck={false}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm(p => ({ ...p, is_active: !!checked }))}
              />
              <Label htmlFor="is_active" className="select-none cursor-pointer">
                Đơn vị đang hoạt động
              </Label>
            </div>
          </form>

          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa đơn vị?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ ngưng kích hoạt đơn vị <strong>{deleteTarget?.name}</strong>. Cấu trúc cây cấp dưới liên quan cũng có thể bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
