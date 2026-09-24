import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
  type ReactNode,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { unstable_memoizeMarkdownComponents as memoizeMarkdownComponents } from "@assistant-ui/react-markdown"
import { Check, ChevronLeft, ChevronRight, Copy, Download, Table as TableIcon } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type TableContextType = {
  page: number
  pageSize: number
  totalRows: number
  registerRowCount: (count: number) => void
}

const TablePaginationContext = createContext<TableContextType | null>(null)

function CodeBlock({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace(/language-/, "") || "text"
  const rawCode = String(children || "").replace(/\n$/, "")

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const isInline = !className && !String(children).includes("\n")

  if (isInline) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-900">
      <div className="flex h-8 items-center justify-between border-b border-zinc-800 px-3 font-mono text-[11px] text-zinc-400">
        <span>{language}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 transition-colors hover:text-zinc-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{children}</code>
      </div>
    </div>
  )
}

function extractTableData(tableEl: HTMLTableElement): { markdown: string; csv: string } {
  const rows = Array.from(tableEl.querySelectorAll("tr"))
  const tableData = rows.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) => cell.textContent?.trim() || "")
  )
  if (tableData.length === 0) return { markdown: "", csv: "" }

  const csv = tableData
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const colCount = Math.max(...tableData.map((r) => r.length), 1)
  const header = tableData[0] || []
  const separator = Array(colCount).fill("---")
  const mdRows = [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...tableData.slice(1).map((r) => `| ${r.join(" | ")} |`),
  ]
  const markdown = mdRows.join("\n")

  return { markdown, csv }
}

function stripVnDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

function SmartCellContent({ children }: { children: ReactNode }) {
  if (typeof children !== "string" && typeof children !== "number") {
    return <>{children}</>
  }
  const text = String(children).trim()
  if (!text) return <>{children}</>

  // Positive trend / delta (e.g. "+12.4%", "↑ 5%", "+4.2% ↑")
  if (
    /^(\+|\↑|\▲)\s*[\d.,]+%?/.test(text) ||
    /\b\+[\d.,]+%/.test(text) ||
    (text.endsWith("↑") && !text.startsWith("-"))
  ) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
        {text}
      </span>
    )
  }

  // Negative trend / delta (e.g. "-3.1%", "↓ 2.5%", "-12% ↓")
  if (
    /^(-|\↓|\▼)\s*[\d.,]+%?/.test(text) ||
    /\b-[\d.,]+%/.test(text) ||
    (text.endsWith("↓") && !text.startsWith("+"))
  ) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
        {text}
      </span>
    )
  }

  // Status pill matching via normalized ASCII string
  const normalized = stripVnDiacritics(text)
  if (
    normalized === "hoan thanh" ||
    normalized === "thanh cong" ||
    normalized === "binh thuong" ||
    normalized === "du tieu chuan" ||
    normalized === "active" ||
    normalized === "success" ||
    normalized === "approved" ||
    normalized === "da duyet"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {text}
      </span>
    )
  }

  if (
    normalized === "canh bao" ||
    normalized === "can chu y" ||
    normalized === "dang xu ly" ||
    normalized === "cho duyet" ||
    normalized === "pending" ||
    normalized === "warning" ||
    normalized === "in progress"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {text}
      </span>
    )
  }

  if (
    normalized === "nguy co" ||
    normalized === "nghi ngo" ||
    normalized === "qua han" ||
    normalized === "tu choi" ||
    normalized === "loi" ||
    normalized === "that bai" ||
    normalized === "no xau" ||
    normalized === "mat von" ||
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "rejected" ||
    normalized === "danger"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
        <span className="size-1.5 rounded-full bg-rose-500" />
        {text}
      </span>
    )
  }

  // Code / ID matching (e.g., LN-2026-0891, CUST-012, INV-991)
  if (/^[A-Z]{2,}[-_][A-Z0-9-_]+$/.test(text)) {
    return (
      <code className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
        {text}
      </code>
    )
  }

  // Pure numbers or currency formatting detection (e.g. "450.820.000.000", "12,500,000", "82.1%")
  if (/^[\d.,]+%?$/.test(text) || /^[\d.,]+\s*(vnd|usd|eur)?$/i.test(normalized)) {
    return <span className="font-mono tabular-nums">{text}</span>
  }

  return <>{children}</>
}

// Scroll container for markdown tables: shows a fade on each edge while the
// table overflows, so a clipped last column reads as "scrollable" instead of
// broken — the docked AI panel is much narrower than a full-page chat column.
function TableScrollArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setOverflow({
      left: el.scrollLeft > 1,
      right: max > 1 && el.scrollLeft < max - 1,
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    const content = el?.firstElementChild
    if (!el || !content) return
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    observer.observe(content)
    return () => observer.disconnect()
  }, [sync])

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={sync}
        className="overflow-x-auto"
      >
        {children}
      </div>
      {overflow.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/90 to-transparent" />
      )}
      {overflow.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/90 to-transparent" />
      )}
    </div>
  )
}

function EnhancedMarkdownTable({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const tableRef = useRef<HTMLTableElement>(null)
  const fullTableRef = useRef<HTMLTableElement>(null)
  const [copied, setCopied] = useState(false)
  const [meta, setMeta] = useState<{ rows: number; cols: number } | null>(null)
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const pageSize = 10

  const registerRowCount = useCallback((count: number) => {
    setTotalRows((prev) => (prev === count ? prev : count))
  }, [])

  const contextValue = useMemo<TableContextType>(
    () => ({
      page,
      pageSize,
      totalRows,
      registerRowCount,
    }),
    [page, pageSize, totalRows, registerRowCount]
  )

  useEffect(() => {
    if (!tableRef.current) return
    const cols = tableRef.current.querySelectorAll("thead th")
    setMeta({
      rows: totalRows,
      cols: cols.length || (tableRef.current.querySelector("tr")?.children.length ?? 0),
    })
  }, [totalRows, children])

  const onCopy = async () => {
    const target = fullTableRef.current || tableRef.current
    if (!target) return
    try {
      const { markdown } = extractTableData(target)
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const onExportCsv = () => {
    const target = fullTableRef.current || tableRef.current
    if (!target) return
    try {
      const { csv } = extractTableData(target)
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `table-export-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // ignore
    }
  }

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, pageCount)
  const from = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, totalRows)

  return (
    <TablePaginationContext.Provider value={contextValue}>
      <div className="my-3 overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
        <div className="flex h-8 items-center justify-between border-b border-border/60 bg-muted/40 px-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TableIcon className="size-3.5 text-primary" />
            {meta ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {t("ai.table.metrics", { rows: meta.rows, cols: meta.cols })}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-foreground/80">
                {t("ai.table.result_title", { count: 0 })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("ai.table.copy")}
              title={t("ai.table.copy")}
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">{t("ai.table.copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{t("ai.table.copy")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("ai.table.export_csv")}
              title={t("ai.table.export_csv")}
            >
              <Download className="size-3" />
              <span>{t("ai.table.export_csv")}</span>
            </button>
          </div>
        </div>
        <TableScrollArea>
          <table
            ref={tableRef}
            className="w-full text-left text-xs [&>tbody>tr:last-child>td]:border-b-0"
          >
            {children}
          </table>
        </TableScrollArea>

        {/* Hidden complete table for 1-click full export/copy when paginated */}
        {totalRows > pageSize && (
          <div className="hidden" aria-hidden="true">
            <TablePaginationContext.Provider value={null}>
              <table ref={fullTableRef}>{children}</table>
            </TablePaginationContext.Provider>
          </div>
        )}

        {/* Pagination controls when rows exceed default 10 */}
        {totalRows > pageSize && (
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="tabular-nums">
              {t("ai.table.range", { from, to, total: totalRows })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t("ai.table.prev")}
                title={t("ai.table.prev")}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-1 font-mono text-[10px] tabular-nums">
                {safePage} / {pageCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label={t("ai.table.next")}
                title={t("ai.table.next")}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TablePaginationContext.Provider>
  )
}

// Memoized per hast node so blocks that already finished streaming are
// skipped when ReactMarkdown re-parses the growing message on every token.
const markdownComponents = memoizeMarkdownComponents({
  code(props) {
    const { className, children } = props
    return <CodeBlock className={className}>{children}</CodeBlock>
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
      >
        {children}
      </a>
    )
  },
  ul({ children }) {
    return <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-6">{children}</li>
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
        {children}
      </blockquote>
    )
  },
  tbody({ children }) {
    const tableCtx = useContext(TablePaginationContext)
    const rows = Children.toArray(children)

    useEffect(() => {
      tableCtx?.registerRowCount(rows.length)
    }, [tableCtx, rows.length])

    const displayedRows =
      tableCtx && rows.length > tableCtx.pageSize
        ? rows.slice(
            (tableCtx.page - 1) * tableCtx.pageSize,
            tableCtx.page * tableCtx.pageSize
          )
        : rows

    return (
      <tbody className="[&>tr]:transition-colors [&>tr:nth-child(even)]:bg-muted/15 [&>tr:hover]:bg-primary/[0.04]">
        {displayedRows}
      </tbody>
    )
  },
  table({ children }) {
    return <EnhancedMarkdownTable>{children}</EnhancedMarkdownTable>
  },
  th({ children, style }) {
    return (
      <th
        className="border-b border-border/80 bg-muted/70 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
        style={style}
      >
        {children}
      </th>
    )
  },
  td({ children, style }) {
    const rawText =
      typeof children === "string"
        ? children.trim()
        : typeof children === "number"
          ? String(children)
          : ""
    const isNumeric =
      rawText !== "" &&
      /^[-+↑↓▲▼]?\s*[\d.,]+%?(\s*(vnđ|vnd|usd|eur))?$/i.test(rawText)

    return (
      <td
        className={cn(
          "border-b border-border/40 px-3.5 py-2 align-middle whitespace-nowrap text-xs",
          isNumeric && "text-right tabular-nums",
        )}
        style={style}
      >
        <SmartCellContent>{children}</SmartCellContent>
      </td>
    )
  },
  p({ children }) {
    return <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  },
  h1({ children }) {
    return (
      <h1 className="mt-4 mb-2 text-base font-bold first:mt-0">{children}</h1>
    )
  },
  h2({ children }) {
    return (
      <h2 className="mt-3 mb-2 text-sm font-semibold first:mt-0">{children}</h2>
    )
  },
  h3({ children }) {
    return (
      <h3 className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</h3>
    )
  },
}) as Components

export function MarkdownMessage({
  content,
  className,
  streaming = false,
}: {
  content: string
  className?: string
  streaming?: boolean
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed",
        streaming && "ai-streaming-caret",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
