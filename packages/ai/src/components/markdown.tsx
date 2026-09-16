import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { unstable_memoizeMarkdownComponents as memoizeMarkdownComponents } from "@assistant-ui/react-markdown"
import { Check, Copy } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

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
    <div className="relative my-3">
      <div
        ref={ref}
        onScroll={sync}
        className="overflow-x-auto rounded-lg border"
      >
        {children}
      </div>
      {overflow.left && (
        <div className="pointer-events-none absolute inset-y-px left-px w-6 rounded-l-lg bg-gradient-to-r from-background to-transparent" />
      )}
      {overflow.right && (
        <div className="pointer-events-none absolute inset-y-px right-px w-6 rounded-r-lg bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
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
    return (
      <tbody className="[&>tr]:transition-colors [&>tr:hover]:bg-muted/30">
        {children}
      </tbody>
    )
  },
  table({ children }) {
    return (
      <TableScrollArea>
        {/* The row divider lives on td; only the last row drops it so the
            cell border does not double up with the wrapper border. */}
        <table className="w-full text-left text-xs [&>tbody>tr:last-child>td]:border-b-0">
          {children}
        </table>
      </TableScrollArea>
    )
  },
  th({ children, style }) {
    return (
      <th
        className="border-b bg-muted/50 px-3 py-2 font-semibold whitespace-nowrap"
        style={style}
      >
        {children}
      </th>
    )
  },
  td({ children, style }) {
    // style carries GFM column alignment (`---:` / `:---:`).
    return (
      <td
        className="border-b px-3 py-2 align-top whitespace-nowrap"
        style={style}
      >
        {children}
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
