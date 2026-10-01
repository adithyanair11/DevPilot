"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { fetchRepos, type Repository } from "@/lib/repos"

export const repoKeys = {
  all: ["repos"] as const,
  list: () => [...repoKeys.all, "list"] as const,
}

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
