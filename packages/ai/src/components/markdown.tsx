import { useState, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
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
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-foreground">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border bg-zinc-950 text-zinc-50 dark:bg-zinc-900 shadow-sm">
      <div className="flex h-8 items-center justify-between border-b border-zinc-800 px-3 text-[11px] text-zinc-400 font-mono">
        <span>{language}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 hover:text-zinc-100 transition-colors"
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
      <div className="overflow-x-auto p-3 text-xs leading-relaxed font-mono">
        <code>{children}</code>
      </div>
    </div>
  )
}

const markdownComponents: Components = {
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
      <blockquote className="my-2 border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
        {children}
      </blockquote>
    )
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    )
  },
  th({ children }) {
    return <th className="border-b bg-muted/50 px-3 py-2 font-semibold">{children}</th>
  },
  td({ children }) {
    return <td className="border-b px-3 py-2 last:border-b-0">{children}</td>
  },
  p({ children }) {
    return <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h3>
  },
}

export function MarkdownMessage({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}