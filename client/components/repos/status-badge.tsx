import { CircleDashedIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { IndexStatus } from "@/lib/repos"

type StatusConfig = {
  label: string
  hint: string
  icon: LucideIcon
  className: string
}

/**
 * Only PENDING is produced by the backend today. Add INDEXING / READY / FAILED
 * here once indexing ships; unknown statuses fall back to a neutral badge.
 */
const STATUS_CONFIG: Partial<Record<IndexStatus, StatusConfig>> = {
  PENDING: {
    label: "Not indexed",
    hint: "Synced from GitHub. This repository hasn't been indexed yet.",
    icon: CircleDashedIcon,
    className: "border-border bg-muted text-muted-foreground",
  },
}

export function StatusBadge({ status, className }: { status: IndexStatus; className?: string }) {
  const config = STATUS_CONFIG[status]

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const Icon = config.icon
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" className={cn(config.className, className)} tabIndex={0} />
        }
      >
        <Icon data-icon="inline-start" />
        {config.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{config.hint}</TooltipContent>
    </Tooltip>
  )
}
