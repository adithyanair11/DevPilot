import { CircleCheckIcon, CircleDashedIcon, Loader2Icon, OctagonXIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { IndexStatus } from "@/lib/repos"

type StatusConfig = {
  label: string
  hint: string
  icon: LucideIcon
  iconClassName?: string
  className: string
}

const STATUS_CONFIG: Record<IndexStatus, StatusConfig> = {
  PENDING: {
    label: "Not indexed",
    hint: "Synced from GitHub. Index it to start asking questions about the code.",
    icon: CircleDashedIcon,
    className: "border-border bg-muted text-muted-foreground",
  },
  INDEXING: {
    label: "Indexing",
    hint: "Reading files from GitHub and creating embeddings.",
    icon: Loader2Icon,
    iconClassName: "animate-spin",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  READY: {
    label: "Ready",
    hint: "Indexed and searchable.",
    icon: CircleCheckIcon,
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  FAILED: {
    label: "Failed",
    hint: "Indexing failed.",
    icon: OctagonXIcon,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
}

type StatusBadgeProps = {
  status: IndexStatus
  /** Shown in the tooltip for FAILED repositories. */
  errorMessage?: string | null
  className?: string
}

export function StatusBadge({ status, errorMessage, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    )
  }

  const Icon = config.icon
  const hint = status === "FAILED" && errorMessage ? `Indexing failed: ${errorMessage}` : config.hint

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" className={cn(config.className, className)} tabIndex={0} />
        }
      >
        <Icon data-icon="inline-start" className={config.iconClassName} />
        {config.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-64 break-words">{hint}</TooltipContent>
    </Tooltip>
  )
}
