"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ExternalLinkIcon, GitBranchIcon, GlobeIcon, LockIcon, MessageSquareTextIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { IndexButton } from "@/components/repos/index-button"
import { IndexProgress } from "@/components/repos/index-progress"
import { LanguageBadge } from "@/components/repos/language-badge"
import { StatusBadge } from "@/components/repos/status-badge"
import { useIndexStatus } from "@/hooks/use-repos"
import type { Repository } from "@/lib/repos"

export function IndexSummary({ repo }: { repo: Repository }) {
  if (repo.indexStatus === "READY") {
    return (
      <p className="text-xs text-muted-foreground">
        {repo.chunkCount.toLocaleString()} chunks · {repo.filesProcessed.toLocaleString()} files
        {repo.indexedAt && (
          <> · indexed {formatDistanceToNow(new Date(repo.indexedAt), { addSuffix: true })}</>
        )}
      </p>
    )
  }
  if (repo.indexStatus === "FAILED" && repo.errorMessage) {
    return (
      <p className="line-clamp-2 text-xs text-destructive" title={repo.errorMessage}>
        {repo.errorMessage}
      </p>
    )
  }
  return null
}

export function RepoCard({ repo }: { repo: Repository }) {
  // Polls /status while this repo is INDEXING and keeps the card live.
  useIndexStatus(repo)

  return (
    <Card className="group/repo relative flex h-full flex-col gap-4 p-5 transition-shadow focus-within:ring-foreground/30 hover:ring-foreground/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-mono text-xs text-muted-foreground">{repo.owner}</p>
          <h3 className="truncate font-heading text-base font-semibold" title={repo.fullName}>
            {/* Stretched link: the whole card opens the repository page. */}
            <Link
              href={`/repos/${repo.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
            >
              {repo.name}
            </Link>
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

      <div className="space-y-3 border-t pt-4">
        {repo.indexStatus === "INDEXING" ? (
          <IndexProgress repo={repo} />
        ) : (
          <IndexSummary repo={repo} />
        )}

        {/* relative z-10 keeps these clickable above the stretched link. */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <StatusBadge status={repo.indexStatus} errorMessage={repo.errorMessage} />
          <div className="flex items-center gap-3">
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
            {repo.indexStatus === "READY" ? (
              <Link href={`/repos/${repo.id}/chat`} className={buttonVariants({ size: "sm" })}>
                <MessageSquareTextIcon />
                Chat
              </Link>
            ) : (
              repo.indexStatus !== "INDEXING" && <IndexButton repo={repo} />
            )}
          </div>
        </div>
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
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  )
}
