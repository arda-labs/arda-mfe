import type { ColumnDef } from "@tanstack/react-table"
import { Download, Edit2, Eye, FileText, Trash2 } from "lucide-react"
import type { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  activeStatusMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import type { FileTemplate, TemplateFileRef } from "../types"
import { templateFileName } from "../urls"

type TranslateFn = ReturnType<typeof useI18n>["t"]

interface TemplateColumnHandlers {
  onPreview: (file: TemplateFileRef) => void
  onDownload: (file: TemplateFileRef) => void
  onEdit: (template: FileTemplate) => void
  onDelete: (template: FileTemplate) => void
}

export function buildTemplateColumns(
  t: TranslateFn,
  handlers: TemplateColumnHandlers
): ColumnDef<FileTemplate>[] {
  const { onPreview, onDownload, onEdit, onDelete } = handlers

  return [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={t("platform.templates.field.code")}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold">
          {row.original.code}
        </span>
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={t("platform.templates.field.name")}
        />
      ),
      enableColumnFilter: true,
      meta: textSearchMeta(
        t("platform.templates.field.name"),
        t("platform.templates.placeholder.search")
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="mt-0.5 line-clamp-1 max-w-[250px] text-xs font-normal text-muted-foreground">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "file",
      accessorFn: (row) => templateFileName(row),
      header: () => (
        <span className="text-xs font-semibold text-foreground/80">
          {t("platform.templates.field.file_attachment")}
        </span>
      ),
      cell: ({ row }) => {
        const file = row.original
        return (
          <div className="flex max-w-[260px] items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-3.5" />
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-xs font-medium"
                title={file.file_url || undefined}
              >
                {templateFileName(file)}
              </div>
              <div
                className="truncate font-mono text-[10px] text-muted-foreground"
                title={file.file_url || undefined}
              >
                {file.file_url}
              </div>
            </div>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "file_type",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={t("platform.templates.field.file_type")}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] uppercase">
          {row.original.file_type}
        </Badge>
      ),
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={t("platform.templates.field.status")}
        />
      ),
      enableColumnFilter: true,
      meta: activeStatusMeta(
        t("platform.templates.field.status"),
        t("platform.templates.status.active"),
        t("platform.templates.status.inactive")
      ),
      cell: ({ row }) => (
        <Status variant={row.original.is_active ? "success" : "default"}>
          <StatusIndicator />
          <StatusLabel>
            {row.original.is_active
              ? t("platform.templates.status.active")
              : t("platform.templates.status.inactive")}
          </StatusLabel>
        </Status>
      ),
    },
    {
      id: "actions",
      header: () => (
        <span className="sr-only">{t("platform.templates.field.actions")}</span>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-primary"
            title={t("platform.templates.action.view_file")}
            onClick={() => onPreview(row.original)}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-primary"
            title={t("platform.templates.action.download_file")}
            onClick={() => onDownload(row.original)}
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={t("common.action.edit")}
            onClick={() => onEdit(row.original)}
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive"
            title={t("common.action.delete")}
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]
}
