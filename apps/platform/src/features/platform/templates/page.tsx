import { useEffect, useState, useRef } from "react"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { FileTemplate } from "../api"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
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
import { Plus, Edit2, Trash2, Link2, Settings, UploadCloud, File, AlertCircle, Loader2, Download } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export function TemplatesPage() {
  const [templates, setTemplates] = useState<FileTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileTemplate | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Upload States
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    fileType: "jrxml",
    fileUrl: "",
    mappingConfig: "",
    isActive: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listFileTemplates()
      setTemplates(data)
    } catch (err) {
      notify.error("Không thể tải danh sách mẫu biểu", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingTemplate(null)
    setSelectedFile(null)
    setUploadProgress(null)
    setForm({
      code: "",
      name: "",
      description: "",
      fileType: "jrxml",
      fileUrl: "",
      mappingConfig: "{\n  \"mappings\": []\n}",
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (tmpl: FileTemplate) => {
    setEditingTemplate(tmpl)
    setSelectedFile(tmpl.file_url ? { name: tmpl.file_url.split("/").pop() || "Template File", size: 0 } : null)
    setUploadProgress(null)
    setForm({
      code: tmpl.code,
      name: tmpl.name,
      description: tmpl.description || "",
      fileType: tmpl.file_type,
      fileUrl: tmpl.file_url,
      mappingConfig: tmpl.mapping_config || "",
      isActive: tmpl.is_active,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.fileUrl.trim()) {
      notify.error("Vui lòng nhập đầy đủ Mã, Tên và Tải file lên")
      return
    }

    // Validate JSON mappingConfig if not empty
    if (form.mappingConfig.trim()) {
      try {
        JSON.parse(form.mappingConfig)
      } catch (err) {
        notify.error("Cấu hình Mapping JSON không hợp lệ")
        return
      }
    }

    setSubmitting(true)
    try {
      const payload: Partial<FileTemplate> = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        file_type: form.fileType,
        file_url: form.fileUrl.trim(),
        mapping_config: form.mappingConfig.trim() || undefined,
        is_active: form.isActive,
      }

      if (editingTemplate) {
        await platformApi.updateFileTemplate(editingTemplate.id, payload)
        notify.success("Cập nhật mẫu biểu thành công")
      } else {
        await platformApi.createFileTemplate(payload)
        notify.success("Thêm mẫu biểu thành công")
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      notify.error("Lưu mẫu biểu thất bại", translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteFileTemplate(deleteTarget.id)
      notify.success("Xóa mẫu biểu thành công")
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error("Xóa mẫu biểu thất bại", translateApiError(err))
    }
  }

  // Handle Drag & Drop File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    setSelectedFile({ name: file.name, size: file.size })
    
    // Automatically detect file extension and match fileType dropdown
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    let matchedType = "jrxml"
    if (["jrxml", "docx", "xlsx", "pdf", "html"].includes(extension)) {
      matchedType = extension
    }
    setForm(p => ({ ...p, fileType: matchedType }))

    setUploadProgress(20)
    try {
      const res = await uploadFile(
        file,
        "platform",
        "file_template",
        form.code || "temp_id"
      )
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgress(null)
        setForm(p => ({ ...p, fileUrl: res.url }))
        notify.success(`Đã tải file ${file.name} lên media-service thành công!`)
      }, 300)
    } catch (err) {
      setUploadProgress(null)
      notify.error("Tải file thất bại", translateApiError(err))
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-xl">Mẫu biểu hệ thống (Templates)</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
            Tổng số: {templates.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 px-4 font-semibold text-sm gap-1.5">
          <Plus className="size-4" /> Thêm mẫu biểu
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Đang tải dữ liệu mẫu biểu...
        </div>
      ) : (
        <Card className="border-muted/50 rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Mã mẫu</TableHead>
                  <TableHead>Tên mẫu biểu</TableHead>
                  <TableHead className="w-[120px]">Định dạng</TableHead>
                  <TableHead>Đường dẫn file (Storage / S3)</TableHead>
                  <TableHead className="w-[120px]">Trạng thái</TableHead>
                  <TableHead className="text-right w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Chưa có mẫu biểu nào được cấu hình.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((tmpl) => (
                    <TableRow key={tmpl.id}>
                      <TableCell className="font-mono text-xs font-bold">{tmpl.code}</TableCell>
                      <TableCell className="font-medium">
                        <div>{tmpl.name}</div>
                        {tmpl.description && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1 max-w-[250px]">
                            {tmpl.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {tmpl.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground text-xs font-mono">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            <Link2 className="size-3 flex-shrink-0" />
                            <a
                              href={tmpl.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate hover:underline hover:text-primary cursor-pointer"
                              title="Xem tệp tin mẫu"
                            >
                              {tmpl.file_url}
                            </a>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-muted-foreground hover:text-primary flex-shrink-0"
                            onClick={() => window.open(tmpl.file_url + "/download", "_blank")}
                            title="Tải xuống tệp tin mẫu"
                          >
                            <Download className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Status variant={tmpl.is_active ? "success" : "default"}>
                          <StatusIndicator />
                          <StatusLabel>{tmpl.is_active ? "Hoạt động" : "Tạm ngưng"}</StatusLabel>
                        </Status>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(tmpl)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(tmpl)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Cập nhật mẫu biểu" : "Thêm mẫu biểu mới"}</DialogTitle>
            <DialogDescription>
              Tải file biểu mẫu và cấu hình sơ đồ dữ liệu mapping JSON chi tiết.
            </DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="max-h-[60vh] overflow-y-auto px-1.5 py-1.5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Mã mẫu biểu</Label>
                  <Input
                    id="code"
                    placeholder="CONTRACT_TEMPL_V1"
                    value={form.code}
                    onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editingTemplate}
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tên mẫu biểu</Label>
                  <Input
                    id="name"
                    placeholder="Hợp đồng tín dụng mẫu"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Mô tả mẫu biểu</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả công dụng hoặc phạm vi của mẫu biểu..."
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  spellCheck={false}
                  className="min-h-[80px] resize-y"
                />
              </div>

              {/* Drag & Drop File Upload Area */}
              <div className="space-y-1.5">
                <Label>Tệp biểu mẫu đính kèm (Kéo thả hoặc Chọn file)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jrxml,.docx,.xlsx,.pdf,.html"
                  onChange={handleFileChange}
                />
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                    dragActive ? "border-primary bg-primary/5" : "border-muted/80 hover:bg-muted/10",
                    form.fileUrl ? "bg-muted/5 border-success/40" : ""
                  )}
                >
                  {uploadProgress !== null ? (
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs text-center py-2">
                      <Loader2 className="size-8 text-primary animate-spin" />
                      <span className="text-sm font-medium">Đang tải file lên media-service... ({uploadProgress}%)</span>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : form.fileUrl ? (
                    <div className="flex items-center gap-3 w-full p-2 bg-success/5 border border-success/20 rounded-lg">
                      <File className="size-8 text-success flex-shrink-0" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-semibold text-foreground truncate">{selectedFile?.name || "Template File"}</p>
                        <p className="text-xs text-muted-foreground">{selectedFile?.size ? formatFileSize(selectedFile.size) : "Đã liên kết"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-primary hover:bg-muted/60"
                          title="Tải xuống tệp tin mẫu"
                          onClick={() => window.open(form.fileUrl, "_blank")}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Badge variant="outline" className="uppercase font-bold text-[10px] border-success text-success">
                          {form.fileType}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="size-8 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground text-center">Kéo thả file vào đây hoặc click để chọn file</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Hỗ trợ định dạng: .jrxml (Jasper), .docx, .xlsx, .pdf, .html
                      </p>
                    </>
                  )}
                </div>

                {form.fileUrl && !uploadProgress && (
                  <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground font-mono px-1 w-full mt-1.5">
                    <AlertCircle className="size-3 flex-shrink-0 text-success mt-0.5" />
                    <div className="break-all whitespace-normal flex-1" title={form.fileUrl}>
                      <span className="font-semibold text-foreground">S3 Link: </span>
                      {form.fileUrl}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Định dạng file (tự động nhận diện)</Label>
                  <div className="h-9 px-3 flex items-center rounded-lg border border-input bg-muted/40 font-bold text-xs uppercase text-foreground w-fit">
                    {form.fileType || "Chưa nhận diện"}
                  </div>
                </div>

                <div className="space-y-1.5 flex items-end pb-2.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      checked={form.isActive}
                      onCheckedChange={(checked) => setForm(p => ({ ...p, isActive: !!checked }))}
                    />
                    <Label htmlFor="isActive" className="select-none cursor-pointer">
                      Mẫu biểu đang hoạt động
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Settings className="size-3.5 text-muted-foreground" />
                  <Label htmlFor="mappingConfig">Cấu hình Mapping (JSON)</Label>
                </div>
                <Textarea
                  id="mappingConfig"
                  placeholder='{\n  "mappings": []\n}'
                  value={form.mappingConfig}
                  onChange={(e) => setForm(p => ({ ...p, mappingConfig: e.target.value }))}
                  spellCheck={false}
                  className="font-mono text-xs h-[180px]"
                />
              </div>
            </div>
          </form>

          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || uploadProgress !== null}>
              {submitting ? "Đang lưu..." : "Lưu lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa mẫu biểu?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn cấu hình mẫu biểu <strong>{deleteTarget?.name}</strong> khỏi danh sách quản lý. Đường dẫn file gốc trên Storage không bị ảnh hưởng.
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
