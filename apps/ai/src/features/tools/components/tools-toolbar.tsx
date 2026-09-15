import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Search } from "lucide-react"
import type { RiskLevel, ToolKind } from "../types"

export interface DomainOption {
  value: string
  count: number
}

interface ToolsToolbarProps {
  domains: DomainOption[]
  domain: string
  onDomainChange: (value: string) => void
  kind: string
  onKindChange: (value: string) => void
  risk: string
  onRiskChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
}

const KINDS: Array<ToolKind | "all"> = ["all", "read", "confirm"]
const RISKS: Array<RiskLevel | "all"> = ["all", "low", "medium", "high"]
const STATUSES = ["all", "enabled", "disabled"] as const

export function ToolsToolbar({
  domains,
  domain,
  onDomainChange,
  kind,
  onKindChange,
  risk,
  onRiskChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
}: ToolsToolbarProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-3">
      {/* Domain chips are derived from the payload, never hard-coded, so a new
          contract domain appears without a frontend change (ADR-003 §3). */}
      <div className="flex flex-wrap gap-1.5">
        {domains.map((option) => (
          <Button
            key={option.value}
            variant={domain === option.value ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onDomainChange(option.value)}
          >
            <span className={option.value === "all" ? "" : "uppercase"}>
              {option.value === "all"
                ? t("ai.tools.domain.all")
                : option.value}
            </span>
            <span className="text-[10px] font-semibold opacity-70">
              {option.count}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={kind} onValueChange={onKindChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((value) => (
              <SelectItem key={value} value={value} className="text-xs">
                {value === "all"
                  ? t("ai.tools.filter.all_kinds")
                  : t(`ai.tools.kind.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={risk} onValueChange={onRiskChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RISKS.map((value) => (
              <SelectItem key={value} value={value} className="text-xs">
                {value === "all"
                  ? t("ai.tools.filter.all_risks")
                  : t(`ai.tools.risk.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value} className="text-xs">
                {t(`ai.tools.filter.status_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full sm:ml-auto sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder={t("ai.tools.placeholder.search")}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
