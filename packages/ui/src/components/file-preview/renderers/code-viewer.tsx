import * as React from "react"
import { Check, Copy, FileCode2, Search, WrapText } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { detectCodeLanguage } from "../file-preview-types"

interface CodeViewerProps {
  content: string
  filename: string
  className?: string
}

export function CodeViewer({ content, filename, className }: CodeViewerProps) {
  const language = detectCodeLanguage(filename)
  const [copied, setCopied] = React.useState(false)
  const [wrap, setWrap] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showSearch, setShowSearch] = React.useState(false)
  const [formattedContent, setFormattedContent] = React.useState<string>(() => {
    if (language === "json") {
      try {
        const parsed = JSON.parse(content)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return content
      }
    }
    return content
  })

  const lines = React.useMemo(() => formattedContent.split("\n"), [formattedContent])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleFormat = () => {
    if (language === "json") {
      try {
        const parsed = JSON.parse(formattedContent)
        setFormattedContent(JSON.stringify(parsed, null, 2))
      } catch {
        // Invalid JSON
      }
    }
  }

  const filteredLines = React.useMemo(() => {
    if (!searchQuery.trim()) return lines.map((text, idx) => ({ num: idx + 1, text, highlight: false }))
    const q = searchQuery.toLowerCase()
    return lines.map((text, idx) => ({
      num: idx + 1,
      text,
      highlight: text.toLowerCase().includes(q),
    }))
  }, [lines, searchQuery])

  const matchCount = React.useMemo(() => {
    if (!searchQuery.trim()) return 0
    return filteredLines.filter((l) => l.highlight).length
  }, [filteredLines, searchQuery])

  return (
    <div className={cn("flex flex-col h-full overflow-hidden border rounded-lg bg-card text-card-foreground", className)}>
      {/* Code Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
            {language}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {lines.length} lines · {content.length} chars
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {showSearch ? (
            <div className="relative flex items-center">
              <Search className="absolute left-2 size-3 text-muted-foreground" />
              <Input
                size={undefined}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in file..."
                className="h-7 w-40 text-xs pl-7 pr-2"
                autoFocus
              />
              {searchQuery && (
                <span className="ml-1.5 text-[11px] text-muted-foreground font-mono">
                  {matchCount} hits
                </span>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setShowSearch(true)}
              title="Search (Ctrl+F)"
            >
              <Search className="size-3.5" />
            </Button>
          )}

          {language === "json" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleFormat}
              title="Prettify JSON"
            >
              <FileCode2 className="size-3.5 mr-1" />
              Format
            </Button>
          )}

          <Button
            variant={wrap ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            onClick={() => setWrap(!wrap)}
            title="Toggle Word Wrap"
          >
            <WrapText className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleCopy}
            title="Copy to Clipboard"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="flex-1 overflow-auto font-mono text-xs p-3 leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {filteredLines.map(({ num, text, highlight }) => (
              <tr
                key={num}
                className={cn(
                  "hover:bg-muted/40 transition-colors",
                  highlight && "bg-amber-500/15 dark:bg-amber-500/20"
                )}
              >
                <td className="w-10 select-none pr-3 text-right text-muted-foreground/60 border-r border-border/40 align-top text-[11px]">
                  {num}
                </td>
                <td
                  className={cn(
                    "pl-3 align-top",
                    wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
                  )}
                >
                  {text || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
