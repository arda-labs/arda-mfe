import { useEffect, useState } from "react"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { Parameter, Organization } from "../api"
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
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@workspace/ui/components/command"
import { cn } from "@workspace/ui/lib/utils"
import { Plus, Edit2, Trash2, Key, Eye, EyeOff, Search, Check, ChevronsUpDown } from "lucide-react"

const VALUE_TYPES = [
  { value: "string", label: "Chuỗi (String)" },
  { value: "number", label: "Số (Number)" },
  { value: "boolean", label: "Boolean (Đúng/Sai)" },
  { value: "json", label: "Cấu hình JSON" },
  { value: "date", label: "Ngày tháng (Date)" },
]

const SCOPE_TYPES = [
  { value: "global", label: "Toàn cục (Global)" },
  { value: "tenant", label: "Khách hàng (Tenant)" },
  { value: "org", label: "Tổ chức (Organization)" },
  { value: "branch", label: "Chi nhánh (Branch)" },
  { value: "department", label: "Phòng ban (Department)" },
]

export function ParametersPage() {
  const [params, setParams] = useState<Parameter[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [orgSearchOpen, setOrgSearchOpen] = useState(false)

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Parameter | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Secret display mapping
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    key: "",
    value: "",
    value_type: "string" as any,
    scope_type: "global" as any,
    scope_id: "",
    description: "",
    is_secret: false,
  })

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
      notify.error("Không thể tải dữ liệu tham số", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingParam(null)
    setForm({
      key: "",
      value: "",
      value_type: "string",
      scope_type: "global",
      scope_id: "",
      description: "",
      is_secret: false,
    })
    setDialogOpen(true)
  }

  const openEdit = (param: Parameter) => {
    setEditingParam(param)
    setForm({
      key: param.key,
      value: param.value,
      value_type: param.value_type,
      scope_type: param.scope_type,
      scope_id: param.scope_id || "",
      description: param.description || "",
      is_secret: param.is_secret,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.key.trim() || (!form.is_secret && !form.value.trim())) {
      notify.error("Khóa và giá trị tham số không được để trống")
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Parameter> = {
        key: form.key.trim(),
        value: form.value,
        value_type: form.value_type,
        scope_type: form.scope_type,
        scope_id: form.scope_id.trim() || undefined,
        description: form.description.trim() || undefined,
        is_secret: form.is_secret,
      }
      if (editingParam) {
        payload.id = editingParam.id
      }
      await platformApi.upsertParameter(payload)
      notify.success("Lưu tham số hệ thống thành công")
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu tham số thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteParameter(deleteTarget.id)
      notify.success("Xóa tham số thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error("Xóa tham số thất bại", translateApiError(err))
    }
  }

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets(p => ({ ...p, [id]: !p[id] }))
  }

  const filteredParams = params.filter(
    p =>
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-xl">Tham số hệ thống</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
            Tổng số: {filteredParams.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 px-4 font-semibold text-sm gap-1.5">
          <Plus className="size-4" /> Thêm tham số
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-muted/10 p-3 rounded-2xl border border-muted/60">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên tham số hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Đang tải cấu hình tham số...
        </div>
      ) : (
        <Card className="border-muted/50 rounded-2xl shadow-sm overflow-hidden bg-background">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tham số (Key)</TableHead>
                  <TableHead>Giá trị (Value)</TableHead>
                  <TableHead>Kiểu dữ liệu</TableHead>
                  <TableHead>Phạm vi (Scope)</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không tìm thấy tham số nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParams.map((p) => {
                    const isRevealed = revealedSecrets[p.id]
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{p.key}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {p.is_secret ? (
                            <div className="flex items-center gap-2">
                              <Key className="size-3.5 text-yellow-500 shrink-0" />
                              <span className="font-mono text-xs">
                                {isRevealed ? (p.value || "[Bảo mật]") : "••••••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealSecret(p.id)}
                                className="text-muted-foreground hover:text-foreground ml-1"
                              >
                                {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            </div>
                          ) : p.value_type === "boolean" ? (
                            <Status variant={p.value === "true" ? "success" : "default"}>
                              <StatusIndicator />
                              <StatusLabel>{p.value === "true" ? "TRUE" : "FALSE"}</StatusLabel>
                            </Status>
                          ) : p.value_type === "json" ? (
                            <code className="text-xs bg-muted/30 border border-muted/80 rounded px-1.5 py-0.5">JSON</code>
                          ) : (
                            <span className="font-mono text-xs">{p.value}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {p.value_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs font-semibold">
                            {p.scope_type} {p.scope_id ? (
                              p.scope_type === "org"
                                ? `(${orgs.find(o => o.id === p.scope_id)?.name || p.scope_id})`
                                : `(${p.scope_id})`
                            ) : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                          {p.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(p)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(p)}>
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
            <DialogTitle>{editingParam ? "Cập nhật tham số" : "Thêm tham số mới"}</DialogTitle>
            <DialogDescription>
              Tùy chỉnh thông tin cấu hình tham số động cho các phân hệ chức năng.
            </DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key">Khóa tham số (Key)</Label>
              <Input
                id="key"
                placeholder="APP_ROUTING_TIMOUT"
                value={form.key}
                onChange={(e) => setForm(p => ({ ...p, key: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                disabled={!!editingParam}
                className="font-mono uppercase"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="value_type">Kiểu dữ liệu</Label>
                <Select
                  value={form.value_type}
                  onValueChange={(val) => setForm(p => ({ ...p, value_type: val as any, value: "" }))}
                >
                  <SelectTrigger id="value_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALUE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scope_type">Phạm vi hiệu lực</Label>
                <Select
                  value={form.scope_type}
                  onValueChange={(val) => setForm(p => ({ ...p, scope_type: val as any, scope_id: "" }))}
                >
                  <SelectTrigger id="scope_type">
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
            </div>

            {form.scope_type !== "global" && (
              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="scope_id">Mã định danh phạm vi (Scope ID)</Label>
                {form.scope_type === "org" ? (
                  <Popover open={orgSearchOpen} onOpenChange={setOrgSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orgSearchOpen}
                        className="justify-between text-left font-normal h-10 w-full rounded-xl"
                      >
                        {form.scope_id
                          ? orgs.find((org) => org.id === form.scope_id)?.name || form.scope_id
                          : "Chọn tổ chức..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0 rounded-xl" align="start">
                      <Command className="rounded-xl">
                        <CommandInput placeholder="Tìm kiếm tổ chức..." />
                        <CommandList>
                          <CommandEmpty>Không tìm thấy tổ chức nào.</CommandEmpty>
                          <CommandGroup>
                            {orgs.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => {
                                  setForm((p) => ({ ...p, scope_id: org.id }))
                                  setOrgSearchOpen(false)
                                }}
                                className="flex items-center justify-between"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{org.name}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{org.code}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "h-4 w-4 text-primary",
                                    form.scope_id === org.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    id="scope_id"
                    placeholder={`Mã ${form.scope_type} cần áp dụng`}
                    value={form.scope_id}
                    onChange={(e) => setForm((p) => ({ ...p, scope_id: e.target.value }))}
                    autoComplete="off"
                  />
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="value">Giá trị tham số (Value)</Label>
              {form.value_type === "boolean" ? (
                <div className="flex rounded-lg border border-input p-0.5 bg-background h-10 w-fit items-center px-1">
                  <Button
                    type="button"
                    variant={form.value === "true" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setForm(p => ({ ...p, value: "true" }))}
                  >
                    TRUE
                  </Button>
                  <Button
                    type="button"
                    variant={form.value === "false" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setForm(p => ({ ...p, value: "false" }))}
                  >
                    FALSE
                  </Button>
                </div>
              ) : form.value_type === "json" ? (
                <Textarea
                  id="value"
                  placeholder='{ "key": "value" }'
                  value={form.value}
                  onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))}
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
              ) : form.value_type === "date" ? (
                <Input
                  id="value"
                  type="date"
                  value={form.value}
                  onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))}
                />
              ) : (
                <Input
                  id="value"
                  placeholder="Nhập giá trị"
                  value={form.value}
                  onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))}
                  spellCheck={false}
                  autoComplete="off"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Mô tả tham số</Label>
              <Input
                id="description"
                placeholder="Giải thích mục đích cấu hình tham số..."
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="is_secret"
                checked={form.is_secret}
                onCheckedChange={(checked) => setForm(p => ({ ...p, is_secret: !!checked }))}
              />
              <Label htmlFor="is_secret" className="select-none cursor-pointer">
                Đây là tham số bảo mật (Ẩn hiển thị giá trị)
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
            <AlertDialogTitle>Xác nhận xóa tham số?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa hoàn toàn tham số <strong>{deleteTarget?.key}</strong> khỏi hệ thống và không thể khôi phục.
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
