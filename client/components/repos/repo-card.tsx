import { ExternalLinkIcon, GitBranchIcon, GlobeIcon, LockIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LanguageBadge } from "@/components/repos/language-badge"
import { StatusBadge } from "@/components/repos/status-badge"
import type { Repository } from "@/lib/repos"

export function RepoCard({ repo }: { repo: Repository }) {
  return (
    <Card className="group/repo flex h-full flex-col gap-4 p-5 transition-shadow hover:ring-foreground/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-mono text-xs text-muted-foreground">{repo.owner}</p>
          <h3 className="truncate font-heading text-base font-semibold" title={repo.fullName}>
            {repo.name}
          </h3>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
          title={repo.isPrivate ? "Private repository" : "Public repository"}
        >
          {repo.isPrivate ? <LockIcon className="size-3" /> : <GlobeIcon className="size-3" />}
          {repo.isPrivate ? "Private" : "Public"}
        </span>
      </div>

      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {repo.description || <span className="italic opacity-70">No description</span>}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <LanguageBadge language={repo.language} />
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <GitBranchIcon className="size-3" />
          {repo.defaultBranch}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <StatusBadge status={repo.indexStatus} />
        {repo.htmlUrl && (
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            GitHub
            <ExternalLinkIcon className="size-3" />
            <span className="sr-only">(opens {repo.fullName} in a new tab)</span>
          </a>
        )}
      </div>
    </Card>
  )
}

export function RepoCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-4 p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex justify-between border-t pt-4">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  )
}
