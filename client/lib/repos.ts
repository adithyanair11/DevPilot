import { apiFetch } from "@/lib/api"

/** Mirrors backend `IndexStatus` enum. */
export type IndexStatus = "PENDING" | "INDEXING" | "READY" | "FAILED"

/** Mirrors backend `RepositoryResponse`. */
export type Repository = {
  id: string
  githubRepoId: number
  owner: string
  name: string
  fullName: string
  isPrivate: boolean
  defaultBranch: string
  language: string | null
  htmlUrl: string | null
  description: string | null
  indexStatus: IndexStatus
  indexedAt: string | null
  chunkCount: number
  filesTotal: number
  filesProcessed: number
  errorMessage: string | null
}

/** Mirrors backend `IndexStatusResponse`. */
export type RepositoryIndexStatus = {
  repositoryId: string
  indexStatus: IndexStatus
  filesTotal: number
  filesProcessed: number
  chunkCount: number
  indexedAt: string | null
  errorMessage: string | null
}

/**
 * `refresh: false` → repositories already stored in DevPilot (fast, no GitHub call).
 * `refresh: true`  → pull the latest list from GitHub, upsert, then return it.
 */
export function fetchRepos({ refresh }: { refresh: boolean }) {
  return apiFetch<Repository[]>(`/api/repos?refresh=${refresh}`)
}

export function fetchRepo(id: string) {
  return apiFetch<Repository>(`/api/repos/${encodeURIComponent(id)}`)
}

export function fetchRepoStatus(id: string) {
  return apiFetch<RepositoryIndexStatus>(`/api/repos/${encodeURIComponent(id)}/status`)
}
