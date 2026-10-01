"use client"

import * as React from "react"
import { AlertCircleIcon, FolderGit2Icon, RefreshCwIcon, RotateCwIcon, SearchIcon, SearchXIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { RepoCard, RepoCardSkeleton } from "@/components/repos/repo-card"
import { useRepos, useSyncRepos } from "@/hooks/use-repos"
import type { Repository } from "@/lib/repos"

type Visibility = "all" | "public" | "private"

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
]

function matches(repo: Repository, query: string, visibility: Visibility) {
  if (visibility === "public" && repo.isPrivate) return false
  if (visibility === "private" && !repo.isPrivate) return false
  if (!query) return true
  const q = query.toLowerCase()
  return (
    repo.fullName.toLowerCase().includes(q) ||
    (repo.language?.toLowerCase().includes(q) ?? false) ||
    (repo.description?.toLowerCase().includes(q) ?? false)
  )
}

export function RepoDashboard() {
  const { data: repos, isPending, isError, error, refetch, isRefetching } = useRepos()
  const sync = useSyncRepos()
  const [query, setQuery] = React.useState("")
  const [visibility, setVisibility] = React.useState<Visibility>("all")

  // First visit: nothing stored yet, so pull from GitHub automatically (once).
  const autoSynced = React.useRef(false)
  React.useEffect(() => {
    if (repos && repos.length === 0 && !autoSynced.current) {
      autoSynced.current = true
      sync.mutate()
    }
  }, [repos, sync])

  const filtered = React.useMemo(
    () => (repos ?? []).filter((r) => matches(r, query.trim(), visibility)),
    [repos, query, visibility]
  )
  const privateCount = repos?.filter((r) => r.isPrivate).length ?? 0

  return (
    <section className="flex flex-1 flex-col gap-6" aria-labelledby="repos-heading">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 id="repos-heading" className="font-heading text-xl font-semibold tracking-tight">
            Repositories
          </h2>
          <p className="text-sm text-muted-foreground">
            {repos && repos.length > 0
              ? `${repos.length} synced from GitHub · ${privateCount} private`
              : "Repositories you can access on GitHub."}
          </p>
        </div>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="sm:w-auto">
          <RefreshCwIcon className={cn(sync.isPending && "animate-spin")} />
          {sync.isPending ? "Syncing…" : "Sync with GitHub"}
        </Button>
      </div>

      {/* Toolbar */}
      {repos && repos.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, language…"
              aria-label="Search repositories"
              className="pl-8"
            />
          </div>
          <div
            role="radiogroup"
            aria-label="Filter by visibility"
            className="inline-flex w-fit rounded-md border bg-muted/40 p-0.5"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={visibility === opt.value}
                onClick={() => setVisibility(opt.value)}
                className={cn(
                  "rounded-[calc(var(--radius-md)-2px)] px-3 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  visibility === opt.value && "bg-background text-foreground shadow-xs"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isPending || (repos?.length === 0 && sync.isPending) ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading repositories">
          {Array.from({ length: 6 }, (_, i) => (
            <RepoCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircleIcon className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Couldn&apos;t load your repositories</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RotateCwIcon className={cn(isRefetching && "animate-spin")} />
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      ) : repos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2Icon />
            </EmptyMedia>
            <EmptyTitle>No repositories yet</EmptyTitle>
            <EmptyDescription>
              Sync with GitHub to bring in the public and private repositories you can access.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCwIcon className={cn(sync.isPending && "animate-spin")} />
              Sync with GitHub
            </Button>
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>No matching repositories</EmptyTitle>
            <EmptyDescription>Try a different search or filter.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("")
                setVisibility("all")
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((repo) => (
            <li key={repo.id}>
              <RepoCard repo={repo} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
