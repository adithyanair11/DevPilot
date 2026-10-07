"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import {
  fetchRepo,
  fetchRepoStatus,
  fetchRepos,
  retrieveContext,
  startIndexing,
  type Repository,
  type RepositoryIndexStatus,
} from "@/lib/repos"

export const repoKeys = {
  all: ["repos"] as const,
  list: () => [...repoKeys.all, "list"] as const,
  detail: (id: string) => [...repoKeys.all, "detail", id] as const,
  status: (id: string) => [...repoKeys.all, "status", id] as const,
}

/** How often to poll /status while a repository is indexing. */
const INDEX_POLL_MS = 2000

/** Repositories already stored for this user (no GitHub round trip). */
export function useRepos() {
  return useQuery({
    queryKey: repoKeys.list(),
    queryFn: () => fetchRepos({ refresh: false }),
    staleTime: 60 * 1000,
  })
}

function syncErrorMessage(error: Error) {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return error.message
    if (error.isUnauthorized) return "Your session has expired. Please sign in again."
    // The backend currently surfaces GitHub errors as a 500 with GitHub's message.
    if (error.status === 403 || error.status === 429 || /rate limit/i.test(error.message)) {
      return "GitHub is rate limiting requests right now. Please try again in a few minutes."
    }
  }
  return error.message || "Something went wrong while syncing with GitHub."
}

function repoCount(n: number) {
  return `${n} ${n === 1 ? "repository" : "repositories"}`
}

/** Pulls the latest repository list from GitHub and shows toast feedback. */
export function useSyncRepos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [...repoKeys.all, "sync"],
    mutationFn: () => fetchRepos({ refresh: true }),
    onMutate: () => {
      const previous = queryClient.getQueryData<Repository[]>(repoKeys.list())
      const toastId = toast.add({
        type: "loading",
        title: "Syncing with GitHub…",
        description: "Fetching your latest repositories.",
        timeout: 0,
      })
      return { toastId, previousIds: new Set(previous?.map((r) => r.id) ?? []) }
    },
    onSuccess: (repos, _vars, context) => {
      queryClient.setQueryData(repoKeys.list(), repos)

      const added = context ? repos.filter((r) => !context.previousIds.has(r.id)).length : 0
      const hadPrevious = !!context && context.previousIds.size > 0
      const total = repoCount(repos.length)
      const description =
        repos.length === 0
          ? "No repositories were found on your GitHub account."
          : hadPrevious && added > 0
            ? `${total} synced · ${added} new`
            : `${total} up to date`

      const update = { type: "success", title: "Sync complete", description, timeout: 4000 }
      if (context) toast.update(context.toastId, update)
      else toast.add(update)
    },
    onError: (error: Error, _vars, context) => {
      const update = {
        type: "error",
        title: "Sync failed",
        description: syncErrorMessage(error),
        timeout: 6000,
      }
      if (context) toast.update(context.toastId, update)
      else toast.add(update)
    },
  })
}

// ---------------------------------------------------------------------------
// Single repository
// ---------------------------------------------------------------------------

export function useRepo(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: repoKeys.detail(id),
    queryFn: () => fetchRepo(id),
    // Show the card's data instantly when coming from the dashboard.
    initialData: () =>
      queryClient.getQueryData<Repository[]>(repoKeys.list())?.find((r) => r.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(repoKeys.list())?.dataUpdatedAt,
    staleTime: 30 * 1000,
    // A 404/403 won't fix itself; only retry network or server errors.
    retry: (failureCount, error) =>
      failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
  })
}

/** Writes a partial update for one repository into both the list and detail caches. */
function patchRepo(queryClient: QueryClient, id: string, patch: Partial<Repository>) {
  queryClient.setQueryData<Repository[]>(repoKeys.list(), (list) =>
    list?.map((r) => (r.id === id ? { ...r, ...patch } : r))
  )
  queryClient.setQueryData<Repository>(repoKeys.detail(id), (repo) =>
    repo ? { ...repo, ...patch } : repo
  )
}

function findRepo(queryClient: QueryClient, id: string) {
  return (
    queryClient.getQueryData<Repository>(repoKeys.detail(id)) ??
    queryClient.getQueryData<Repository[]>(repoKeys.list())?.find((r) => r.id === id)
  )
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

export function useIndexRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repo: Repository) => startIndexing(repo.id),
    onMutate: (repo) => {
      // Optimistically flip to INDEXING so the progress UI appears immediately.
      const previous = findRepo(queryClient, repo.id)
      // Drop any status left over from a previous run so polling starts fresh.
      queryClient.removeQueries({ queryKey: repoKeys.status(repo.id) })
      patchRepo(queryClient, repo.id, {
        indexStatus: "INDEXING",
        filesProcessed: 0,
        filesTotal: 0,
        chunkCount: 0,
        errorMessage: null,
      })
      return { previous }
    },
    onSuccess: (updated, repo) => {
      patchRepo(queryClient, repo.id, updated)
      toast.add({
        type: "info",
        title: "Indexing started",
        description: `${repo.fullName} is being indexed. You can keep using DevPilot meanwhile.`,
        timeout: 4000,
      })
    },
    onError: (error: Error, repo, context) => {
      if (context?.previous) patchRepo(queryClient, repo.id, context.previous)
      toast.add({
        type: "error",
        title: "Couldn't start indexing",
        description: error.message,
        timeout: 6000,
      })
    },
  })
}

/**
 * Polls /status while the repository is INDEXING, keeps the list/detail caches in
 * sync, and toasts when indexing finishes. Safe to call from several components:
 * React Query dedupes the poll, and the toast fires from the shared queryFn.
 */
export function useIndexStatus(repo: Repository | undefined) {
  const queryClient = useQueryClient()
  const id = repo?.id ?? ""
  const isIndexing = repo?.indexStatus === "INDEXING"

  return useQuery({
    queryKey: repoKeys.status(id),
    enabled: !!repo && isIndexing,
    refetchInterval: (query) =>
      query.state.data?.indexStatus === "INDEXING" || query.state.data === undefined
        ? INDEX_POLL_MS
        : false,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<RepositoryIndexStatus> => {
      const status = await fetchRepoStatus(id)
      const before = findRepo(queryClient, id)

      patchRepo(queryClient, id, {
        indexStatus: status.indexStatus,
        filesTotal: status.filesTotal,
        filesProcessed: status.filesProcessed,
        chunkCount: status.chunkCount,
        indexedAt: status.indexedAt,
        errorMessage: status.errorMessage,
      })

      if (before?.indexStatus === "INDEXING" && status.indexStatus === "READY") {
        toast.add({
          type: "success",
          title: "Repository ready",
          description: `${before.fullName}: ${status.chunkCount.toLocaleString()} chunks from ${status.filesProcessed.toLocaleString()} files.`,
          timeout: 5000,
        })
      } else if (before?.indexStatus === "INDEXING" && status.indexStatus === "FAILED") {
        toast.add({
          type: "error",
          title: "Indexing failed",
          description: `${before.fullName}: ${status.errorMessage ?? "Unknown error"}`,
          timeout: 8000,
        })
      }
      return status
    },
  })
}

// ---------------------------------------------------------------------------
// Vector context retrieval
// ---------------------------------------------------------------------------

export function useRetrieveContext(repoId: string) {
  return useMutation({
    mutationKey: [...repoKeys.all, "retrieve", repoId],
    mutationFn: (question: string) => retrieveContext(repoId, question),
  })
}
