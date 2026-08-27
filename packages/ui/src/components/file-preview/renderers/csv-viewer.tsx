import * as React from "react"
import { ChevronLeft, ChevronRight, Search, Table as TableIcon } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface CsvViewerProps {
  content: string
  filename: string
  className?: string
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const isTsv = text.includes("\t") && !text.includes(",")
  const delimiter = isTsv ? "\t" : ","

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim())
      currentField = ""
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++
      }
      currentRow.push(currentField.trim())
      if (currentRow.some((field) => field !== "")) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ""
    } else {
      currentField += char
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((field) => field !== "")) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  return { headers, rows: dataRows }
}

const PAGE_SIZE = 50

export function CsvViewer({ content, filename: _filename, className }: CsvViewerProps) {
  const { t } = useI18n()
  const { headers, rows } = React.useMemo(() => parseCsv(content), [content])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [page, setPage] = React.useState(1)

  const filteredRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)))
  }, [rows, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const paginatedRows = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  return (
    <div className={cn("flex flex-col h-full overflow-hidden border rounded-lg bg-card text-card-foreground", className)}>
      {/* CSV Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <TableIcon className="size-3 text-emerald-600" />
            TABLE VIEW
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {rows.length} {t("preview.rows")} · {headers.length} {t("preview.columns")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2 size-3 text-muted-foreground" />
            <Input
              size={undefined}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder={t("preview.search_in_file")}
              className="h-7 w-48 text-xs pl-7 pr-2"
            />
          </div>

          <div className="flex items-center gap-1 border-l pl-2 border-border/60">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title={t("pagination.previous_page")}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono px-1">
              {page}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title={t("pagination.next_page")}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="flex-1 overflow-auto select-text">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
            <tr className="border-b border-border/80 text-left font-semibold text-foreground">
              <th className="w-12 px-3 py-2 text-center text-muted-foreground/60 border-r text-[11px]">#</th>
              {headers.map((header, idx) => (
                <th key={idx} className="px-3 py-2 border-r border-border/40 whitespace-nowrap">
                  {header || `Column ${idx + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIdx) => {
              const actualRowIndex = (page - 1) * PAGE_SIZE + rowIdx + 1
              return (
                <tr
                  key={rowIdx}
                  className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-3 py-1.5 text-center text-muted-foreground/60 border-r border-border/40 font-mono text-[11px]">
                    {actualRowIndex}
                  </td>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-1.5 border-r border-border/30 max-w-xs truncate">
                      {cell || <span className="text-muted-foreground/40 italic">null</span>}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
