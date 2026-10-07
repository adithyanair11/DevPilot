"use client"

import * as React from "react"
import { ChevronDownIcon, ExternalLinkIcon, FileCodeIcon } from "lucide-react"
import { cn } from "cn"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { languageColor } from "@/components/repos/language-badge"
import { formatLines, type Citation, type Repository } from "@/lib/repos"

type CitationContextValue = {
  citations: Citation[]
  select: (index: number) => void
}

const CitationContext = React.createContext<CitationContextValue | null>(null)

/** Which [n] markers appear in an answer (outside code). */
export function citedIndexes(content: string): Set<number> {
  const withoutCode = content.replace(/```[\s\S]*?(```|$)/g, "").replace(/`[^`\n]*`/g, "")
  const found = new Set<number>()
  for (const m of withoutCode.matchAll(/\[(\d{1,2})\]/g)) found.add(Number(m[1]))
  return found
}

export function githubUrl(repo: Pick<Repository, "htmlUrl" | "defaultBranch">, citation: Citation) {
  if (!repo.htmlUrl || !citation.filePath) return null
  const path = citation.filePath.split("/").map(encodeURIComponent).join("/")
  const anchor = citation.startLine
    ? `#L${citation.startLine}${citation.endLine && citation.endLine !== citation.startLine ? `-L${citation.endLine}` : ""}`
    : ""
  return `${repo.htmlUrl}/blob/${encodeURIComponent(repo.defaultBranch)}/${path}${anchor}`
}

/** Inline [n] marker inside an answer. Hover shows the file; click jumps to the source. */
export function CitationChip({ index }: { index: number }) {
  const ctx = React.useContext(CitationContext)
  const citation = ctx?.citations[index - 1]

  if (!ctx || !citation) {
    return <span className="text-xs text-muted-foreground">[{index}]</span>
  }

  const lines = formatLines(citation)
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => ctx.select(index)}
            className="mx-0.5 inline-flex h-4.5 min-w-4.5 -translate-y-0.5 items-center justify-center rounded bg-primary/10 px-1 align-middle font-mono text-[10px] font-semibold text-primary transition-colors outline-none hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Source ${index}: ${citation.filePath ?? "unknown file"}${lines ? ` ${lines}` : ""}`}
          />
        }
      >
        {index}
      </TooltipTrigger>
      <TooltipContent className="max-w-80">
        <span className="font-mono text-xs break-all">{citation.filePath}</span>
        {lines && <span className="ml-1.5 font-mono text-xs opacity-70">{lines}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

type SourcesProps = {
  messageId: string
  content: string
  citations: Citation[]
  repo: Pick<Repository, "htmlUrl" | "defaultBranch">
  children: React.ReactNode
}

/**
 * Wraps an answer so its [n] chips can find and highlight their sources, and
 * renders the sources list below it.
 */
export function AnswerWithSources({ messageId, content, citations, repo, children }: SourcesProps) {
  const [highlighted, setHighlighted] = React.useState<number | null>(null)
  const [showAll, setShowAll] = React.useState(false)
  const timer = React.useRef<number | null>(null)

  const cited = React.useMemo(() => citedIndexes(content), [content])
  const items = citations.map((citation, i) => ({ citation, index: i + 1, cited: cited.has(i + 1) }))
  const primary = items.filter((item) => item.cited)
  const others = items.filter((item) => !item.cited)
  // If the model cited nothing, show everything that was retrieved.
  const visible = primary.length === 0 || showAll ? items : primary

  const select = React.useCallback(
    (index: number) => {
      if (!cited.has(index)) setShowAll(true)
      setHighlighted(index)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setHighlighted(null), 1600)
      requestAnimationFrame(() =>
        document
          .getElementById(`${messageId}-src-${index}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      )
    },
    [cited, messageId]
  )

  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const value = React.useMemo(() => ({ citations, select }), [citations, select])

  return (
    <CitationContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Sources
            {primary.length > 0 && (
              <span className="font-normal"> · {primary.length} cited of {items.length} retrieved</span>
            )}
          </p>
          <ol className="space-y-1">
            {visible.map(({ citation, index, cited: isCited }) => {
              const href = githubUrl(repo, citation)
              const lines = formatLines(citation)
              return (
                <li
                  key={index}
                  id={`${messageId}-src-${index}`}
                  className={cn(
                    "flex min-w-0 scroll-mt-24 items-center gap-2 rounded-md border px-2 py-1.5 transition-colors duration-500",
                    highlighted === index ? "border-primary/50 bg-primary/10" : "bg-background",
                    !isCited && primary.length > 0 && "opacity-75"
                  )}
                >
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                    {index}
                  </span>
                  {citation.language ? (
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: languageColor(citation.language) }}
                    />
                  ) : (
                    <FileCodeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/src inline-flex min-w-0 items-center gap-1 font-mono text-xs outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      title={`Open ${citation.filePath} on GitHub`}
                    >
                      <span className="truncate">{citation.filePath}</span>
                      <ExternalLinkIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover/src:opacity-60" />
                    </a>
                  ) : (
                    <span className="min-w-0 truncate font-mono text-xs">{citation.filePath ?? "Unknown file"}</span>
                  )}
                  {lines && <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{lines}</span>}
                </li>
              )
            })}
          </ol>
          {primary.length > 0 && others.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-expanded={showAll}
            >
              <ChevronDownIcon className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
              {showAll ? "Show cited only" : `Show ${others.length} more retrieved`}
            </button>
          )}
        </div>
      )}
    </CitationContext.Provider>
  )
}
