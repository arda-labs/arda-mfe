import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Download,
  Eye,
  FileUp,
  MoreHorizontal,
  Rocket,
  Trash2,
} from "lucide-react"
import { useI18n } from "@workspace/i18n"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { definitionsApi, type WorkflowProcessDefinition } from "../../api"

const DEFINITION_STATUSES = ["ACTIVE", "DRAFT", "INACTIVE"] as const

const DEFINITIONS_PAGE_SIZE = 10

type DefinitionsTableOptions = {
  definitions: WorkflowProcessDefinition[]
  deployPending: string | null
  saving: string | null
  onStartMonitor: (definition: WorkflowProcessDefinition) => void
  onEdit: (definition: WorkflowProcessDefinition) => void
  onView: (definition: WorkflowProcessDefinition) => void
  onDelete: (definition: WorkflowProcessDefinition) => void
  onDeploy: (id: string) => void
}

/**
 * Client list controller for the BPMN definitions tab: the endpoint returns
 * the full set, so page/sort/filter run in memory behind the shared DataTable
 * and are URL-synced by @workspace/list-page.
 */
export function useDefinitionsTable({
  definitions,
  deployPending,
  saving,
  onStartMonitor,
  onEdit,
  onView,
  onDelete,
  onDeploy,
}: DefinitionsTableOptions) {
  const { t } = useI18n()

  const columns = useMemo<ColumnDef<WorkflowProcessDefinition>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_monitoring.col_process_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("workflow.process_monitoring.col_process_code"),
          t("workflow.process_monitoring.search_placeholder")
        ),
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="text-left font-medium hover:underline"
              onClick={() => onStartMonitor(row.original)}
            >
              {row.original.name}
            </button>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.processCode}
            </p>
          </div>
        ),
      },
      {
        id: "bpmnProcessId",
        accessorKey: "bpmnProcessId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_monitoring.col_bpmn_process")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.bpmnProcessId}
          </span>
        ),
      },
      {
        id: "version",
        accessorKey: "version",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_monitoring.col_version")}
          />
        ),
        cell: ({ row }) => <span>v{row.original.version}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("workflow.process_monitoring.col_status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("workflow.process_monitoring.col_status"),
          DEFINITION_STATUSES.map((status) => ({
            value: status,
            label: t(
              `workflow.process_monitoring.filter_${status.toLowerCase()}`
            ),
          }))
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original
          const pending = deployPending != null || saving != null
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                title={t("workflow.process_monitoring.edit_bpmn_title")}
                onClick={() => onEdit(item)}
              >
                <FileUp className="size-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(item)}>
                    <Eye className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_view_bpmn")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadDefinition(item)}>
                    <Download className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_download_xml")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => onDeploy(item.id)}
                  >
                    <Rocket className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_deploy")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [
      deployPending,
      onDelete,
      onDeploy,
      onEdit,
      onStartMonitor,
      onView,
      saving,
      t,
    ]
  )

  return useClientListTable<WorkflowProcessDefinition>({
    columns,
    items: definitions,
    filterBy: {
      name: (item, value) =>
        matchTextColumnFilter(
          value,
          item.name,
          item.bpmnProcessId,
          item.processCode
        ),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (items, sorting) =>
      sortByColumn(items, sorting, {
        name: (a, b) => a.name.localeCompare(b.name),
        bpmnProcessId: (a, b) => a.bpmnProcessId.localeCompare(b.bpmnProcessId),
        version: (a, b) => a.version - b.version,
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFINITIONS_PAGE_SIZE,
  })
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

async function downloadDefinition(item: WorkflowProcessDefinition) {
  const xml =
    item.xmlContent || (await definitionsApi.getProcessDefinitionXml(item.id))
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = item.resourceName || `${item.bpmnProcessId}.bpmn`
  anchor.click()
  URL.revokeObjectURL(url)
}
