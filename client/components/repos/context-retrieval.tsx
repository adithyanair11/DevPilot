"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  DatabaseZapIcon,
  FileCodeIcon,
  SearchIcon,
  SearchXIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { IndexButton } from "@/components/repos/index-button"
import { languageColor } from "@/components/repos/language-badge"
import { useRetrieveContext } from "@/hooks/use-repos"
import {
  formatLines,
  parseContextText,
  type Repository,
  type RetrievedChunk,
} from "@/lib/repos"

const MAX_QUESTION_LENGTH = 2000

const EXAMPLE_QUESTIONS = [
  "Where is authentication handled?",
  "How are API errors returned to the client?",
  "What happens when the app starts?",
]

/**
 * Lets the user run a vector search against an indexed repository and see the
 * exact chunks (and citations) the backend would hand to the LLM.
 */
export function ContextRetrieval({ repo }: { repo: Repository }) {
  const retrieve = useRetrieveContext(repo.id)
  const [question, setQuestion] = React.useState("")
  const [asked, setAsked] = React.useState<string | null>(null)

  const ready = repo.indexStatus === "READY"
  const trimmed = question.trim()
  const canSubmit = ready && trimmed.length > 0 && !retrieve.isPending

  function submit(q: string = trimmed) {
    if (!ready || !q.trim() || retrieve.isPending) return
    setAsked(q.trim())
    retrieve.mutate(q.trim())
  }

  const chunks = React.useMemo(
    () => (retrieve.data ? parseContextText(retrieve.data) : []),
    [retrieve.data]
  )
  const fileCount = React.useMemo(
    () => new Set(chunks.map((c) => c.citation?.filePath ?? c.label)).size,
    [chunks]
  )

  return (
    <section aria-labelledby="retrieval-heading" className="min-w-0 space-y-5">
      <div className="space-y-1">
        <h2 id="retrieval-heading" className="font-heading text-lg font-semibold tracking-tight">
          Search the code
        </h2>
        <p className="text-sm text-muted-foreground">
          Find the code chunks most relevant to a question. These are the sources DevPilot uses
          to answer.
        </p>
      </div>

      {!ready ? (
        <NotReady repo={repo} />
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="rounded-xl border bg-card p-3 shadow-xs focus-within:ring-3 focus-within:ring-ring/30"
          >
            <label htmlFor="retrieval-question" className="sr-only">
              Question about {repo.fullName}
            </label>
            <Textarea
              id="retrieval-question"
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder={`Ask something about ${repo.name}…`}
              className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <Kbd>⌘</Kbd>
                <Kbd>Enter</Kbd>
                to search
              </span>
              <Button type="submit" disabled={!canSubmit} className="ml-auto">
                {retrieve.isPending ? <Spinner /> : <SearchIcon />}
                {retrieve.isPending ? "Searching…" : "Search"}
              </Button>
            </div>
          </form>

          {!asked && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuestion(q)
                    submit(q)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <SparklesIcon className="size-3 text-primary" />
                  {q}
                </button>
              ))}
            </div>
          )}

          <div aria-live="polite" aria-busy={retrieve.isPending}>
            {retrieve.isPending ? (
              <ResultsSkeleton />
            ) : retrieve.isError ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircleIcon className="text-destructive" />
                  </EmptyMedia>
                  <EmptyTitle>Search failed</EmptyTitle>
                  <EmptyDescription>{retrieve.error.message}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : retrieve.data && chunks.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>No matching code found</EmptyTitle>
                  <EmptyDescription>
                    Try rephrasing the question or naming a feature, file or function.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : retrieve.data ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{chunks.length} chunks</span>
                    <span className="text-muted-foreground">
                      {" "}
                      from {fileCount} {fileCount === 1 ? "file" : "files"} for “{asked}”
                    </span>
                  </p>
                </div>
                <SourceFiles chunks={chunks} />
                <ol className="space-y-3">
                  {chunks.map((chunk) => (
                    <li key={chunk.index}>
                      <ChunkCard chunk={chunk} repo={repo} />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}

function NotReady({ repo }: { repo: Repository }) {
  const indexing = repo.indexStatus === "INDEXING"
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {indexing ? <Spinner className="size-6" /> : <DatabaseZapIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {indexing ? "Indexing in progress" : "Index this repository to search it"}
        </EmptyTitle>
        <EmptyDescription>
          {indexing
            ? "Search will be available as soon as indexing finishes."
            : repo.indexStatus === "FAILED"
              ? "The last indexing run failed. Try again to make the code searchable."
              : "DevPilot needs to read and embed the code before it can find relevant chunks."}
        </EmptyDescription>
      </EmptyHeader>
      {!indexing && <IndexButton repo={repo} size="default" />}
    </Empty>
  )
}

/** Unique files in the result, in rank order, as quick-jump chips. */
function SourceFiles({ chunks }: { chunks: RetrievedChunk[] }) {
  const files: { path: string; first: number; count: number; language: string | null }[] = []
  for (const chunk of chunks) {
    const path = chunk.citation?.filePath ?? chunk.label
    const existing = files.find((f) => f.path === path)
    if (existing) existing.count++
    else files.push({ path, first: chunk.index, count: 1, language: chunk.citation?.language ?? null })
  }

  return (
    <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Source files">
      {files.map((file) => (
        <li key={file.path} className="max-w-full min-w-0">
          <a
            href={`#chunk-${file.first}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-mono text-[11px] transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {file.language && (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: languageColor(file.language) }}
              />
            )}
            <span className="min-w-0 truncate">{file.path}</span>
            {file.count > 1 && <span className="text-muted-foreground">×{file.count}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

function githubFileUrl(repo: Repository, chunk: RetrievedChunk) {
  const path = chunk.citation?.filePath
  if (!repo.htmlUrl || !path) return null
  const encoded = path.split("/").map(encodeURIComponent).join("/")
  const { startLine, endLine } = chunk.citation ?? {}
  const anchor = startLine ? `#L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}` : ""
  return `${repo.htmlUrl}/blob/${encodeURIComponent(repo.defaultBranch)}/${encoded}${anchor}`
}

function ChunkCard({ chunk, repo }: { chunk: RetrievedChunk; repo: Repository }) {
  const path = chunk.citation?.filePath ?? chunk.label
  const lines = formatLines(chunk.citation)
  const href = githubFileUrl(repo, chunk)
  const lineCount = chunk.code.split("\n").length

  return (
    <article
      id={`chunk-${chunk.index}`}
      className="scroll-mt-20 overflow-hidden rounded-xl border bg-card"
      aria-label={`Result ${chunk.index}: ${path}`}
    >
      <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[11px] font-semibold text-primary">
          {chunk.index}
        </span>
        <FileCodeIcon className="size-3.5 shrink-0 text-muted-foreground" />
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate font-mono text-xs hover:underline"
            title={`Open ${path} on GitHub`}
          >
            {path}
          </a>
        ) : (
          <span className="min-w-0 truncate font-mono text-xs">{path}</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
          {lines && <span>{lines}</span>}
          {chunk.citation?.language && <span className="hidden sm:inline">{chunk.citation.language}</span>}
        </span>
      </header>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-5">
        <code>{chunk.code}</code>
      </pre>
      {lineCount > 16 && (
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {lineCount} lines · scroll to see more
        </div>
      )}
    </article>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Searching">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <div className="flex gap-2 border-b bg-muted/40 px-3 py-2">
            <Skeleton className="size-5" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
