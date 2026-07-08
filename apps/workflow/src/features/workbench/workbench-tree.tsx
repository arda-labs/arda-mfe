import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { WorkItemSummaryNode } from "./api"

export function WorkItemTree({
  nodes,
  activeNode,
  onSelect,
}: {
  nodes: WorkItemSummaryNode[]
  activeNode: string
  onSelect: (node: string) => void
}) {
  const visibleNodes = nodes.length
    ? nodes
    : [{ id: "ALL", label: "Tất cả việc được phép nhận", count: 0 }]
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  function toggleNode(nodeId: string) {
    setExpandedNodes((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }))
  }

  return (
    <div className="space-y-0.5" role="tree" aria-label="Loại nghiệp vụ">
      {visibleNodes.map((node) => (
        <WorkItemTreeNode
          key={node.id}
          node={node}
          level={1}
          activeNode={activeNode}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function WorkItemTreeNode({
  node,
  level,
  activeNode,
  expandedNodes,
  onToggle,
  onSelect,
}: {
  node: WorkItemSummaryNode
  level: number
  activeNode: string
  expandedNodes: Record<string, boolean>
  onToggle: (nodeId: string) => void
  onSelect: (nodeId: string) => void
}) {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const isExpanded = expandedNodes[node.id] ?? false
  const isSelected = activeNode === node.id
  const count = hasChildren
    ? node.count || children.reduce((total, child) => total + child.count, 0)
    : node.count

  return (
    <div role="none">
      <div
        className={cn(
          "group flex items-center rounded-md text-sm",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{ paddingLeft: (level - 1) * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
            aria-expanded={isExpanded}
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-2 pr-2 text-left"
          onClick={() => onSelect(node.id)}
        >
          <span className="truncate">{node.label}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {node.overdue ? (
              <Badge variant="destructive">{node.overdue}</Badge>
            ) : null}
            <Badge variant="secondary">{count}</Badge>
          </span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div role="group" className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <WorkItemTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeNode={activeNode}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
