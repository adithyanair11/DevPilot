"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  LockIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ContextRetrieval } from "@/components/repos/context-retrieval"
import { IndexButton } from "@/components/repos/index-button"
import { IndexProgress } from "@/components/repos/index-progress"
import { LanguageBadge } from "@/components/repos/language-badge"
import { StatusBadge } from "@/components/repos/status-badge"
import { useIndexStatus, useRepo } from "@/hooks/use-repos"
import { ApiError } from "@/lib/api"
import type { Repository } from "@/lib/repos"

export default function RepoPage() {
  const { id } = useParams<{ id: string }>()
  const { data: repo, isPending, isError, error } = useRepo(id)
  useIndexStatus(repo)

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon className="size-4" />
        All repositories
      </Link>

      {isPending ? (
        <RepoPageSkeleton />
      ) : isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircleIcon className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>
              {error instanceof ApiError && error.status === 404
                ? "Repository not found"
                : "Couldn't load this repository"}
            </EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Back to repositories
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <RepoHeader repo={repo} />
          <IndexPanel repo={repo} />
          <ContextRetrieval repo={repo} />
        </>
      )}
    </div>
  )
}

function RepoHeader({ repo }: { repo: Repository }) {
  return (
    <header className="space-y-3">
      <div className="space-y-1">
        <p className="font-mono text-sm text-muted-foreground">{repo.owner}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">
          {repo.name}
        </h1>
        {repo.description && <p className="max-w-2xl text-muted-foreground">{repo.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {repo.isPrivate ? <LockIcon className="size-3" /> : <GlobeIcon className="size-3" />}
          {repo.isPrivate ? "Private" : "Public"}
        </span>
        <LanguageBadge language={repo.language} />
        <span className="inline-flex items-center gap-1 font-mono">
          <GitBranchIcon className="size-3" />
          {repo.defaultBranch}
        </span>
        {repo.htmlUrl && (
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            View on GitHub
            <ExternalLinkIcon className="size-3" />
          </a>
        )}
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function IndexPanel({ repo }: { repo: Repository }) {
  const indexedAgo = repo.indexedAt
    ? formatDistanceToNow(new Date(repo.indexedAt), { addSuffix: true })
    : null

  return (
    <section
      aria-labelledby="index-heading"
      className="space-y-4 rounded-xl border bg-card p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 id="index-heading" className="font-heading text-base font-semibold">
              Index
            </h2>
            <StatusBadge status={repo.indexStatus} errorMessage={repo.errorMessage} />
          </div>
          <p className="text-sm text-muted-foreground">
            {repo.indexStatus === "INDEXING"
              ? "Reading files from GitHub and creating embeddings. This page updates automatically."
              : repo.indexStatus === "READY"
                ? `Searchable. Last indexed ${indexedAgo ?? "recently"}.`
                : repo.indexStatus === "FAILED"
                  ? "The last indexing run failed."
                  : "Not indexed yet. Indexing reads the code and makes it searchable."}
          </p>
        </div>
        {repo.indexStatus !== "INDEXING" && <IndexButton repo={repo} size="default" />}
      </div>

      {repo.indexStatus === "INDEXING" && <IndexProgress repo={repo} />}

      {repo.indexStatus === "FAILED" && repo.errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs break-words text-destructive">
          {repo.errorMessage}
        </p>
      )}

      {(repo.indexStatus === "READY" || repo.indexStatus === "INDEXING") && (
        <dl className="grid grid-cols-3 gap-4 border-t pt-4">
          <Stat label="Files" value={repo.filesProcessed.toLocaleString()} />
          <Stat label="Chunks" value={repo.chunkCount.toLocaleString()} />
          <Stat label="Last indexed" value={<span className="text-sm">{indexedAgo ?? "—"}</span>} />
        </dl>
      )}
    </section>
  )
}

function RepoPageSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
