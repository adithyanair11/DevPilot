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

/** Kick off (re-)indexing. The backend answers 202 and indexes in the background. */
export function startIndexing(id: string) {
  return apiFetch<Repository>(`/api/repos/${encodeURIComponent(id)}/index`, { method: "POST" })
}

// ---------------------------------------------------------------------------
// Vector context retrieval
// ---------------------------------------------------------------------------

/** Mirrors backend `CitationDto`. Line numbers are null until the chunker records them. */
export type Citation = {
  filePath: string | null
  startLine: number | null
  endLine: number | null
  language: string | null
}

/** Mirrors backend `RetrievedContext`. */
export type RetrievedContext = {
  citations: Citation[]
  contextText: string
}

export const NO_MATCHES_TEXT = "(no matching code chunks found)"

export function retrieveContext(id: string, question: string) {
  return apiFetch<RetrievedContext>(`/api/repos/${encodeURIComponent(id)}/retrieve`, {
    method: "POST",
    body: JSON.stringify({ question }),
  })
}

export type RetrievedChunk = {
  index: number
  citation: Citation | null
  label: string
  code: string
}

/**
 * Splits the backend's context text into chunks. Each block looks like:
 *
 *   [1] src/App.java (lines 10-42)
 *   ```java
 *   ...code...
 *   ```
 */
export function parseContextText(context: RetrievedContext): RetrievedChunk[] {
  if (!context.contextText || context.contextText.trim() === NO_MATCHES_TEXT) return []

  // Split only where a new numbered header is followed by a code fence, so code that
  // happens to contain "[2] " doesn't break the parse.
  const blocks = context.contextText.split(/\n\n(?=\[\d+\] [^\n]*\n```)/)
  return blocks
    .map((block): RetrievedChunk | null => {
      const header = block.match(/^\[(\d+)\] (.*)\n/)
      if (!header) return null
      const index = Number(header[1])
      const body = block.slice(header[0].length)
      const fenced = body.match(/^```[^\n]*\n([\s\S]*?)\n?```\s*$/)
      return {
        index,
        citation: context.citations[index - 1] ?? null,
        label: header[2],
        code: fenced ? fenced[1] : body.trim(),
      }
    })
    .filter((c): c is RetrievedChunk => c !== null)
}

export function formatLines(citation: Citation | null) {
  if (!citation?.startLine) return null
  if (!citation.endLine || citation.endLine === citation.startLine) return `L${citation.startLine}`
  return `L${citation.startLine}–${citation.endLine}`
}
