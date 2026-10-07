import { cn } from "cn"

import type { Repository } from "@/lib/repos"

/** Progress bar for a repository that is INDEXING. */
export function IndexProgress({
  repo,
  className,
}: {
  repo: Pick<Repository, "filesTotal" | "filesProcessed" | "chunkCount">
  className?: string
}) {
  const { filesTotal, filesProcessed, chunkCount } = repo
  const known = filesTotal > 0
  const percent = known ? Math.min(100, Math.round((filesProcessed / filesTotal) * 100)) : 0

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {known
            ? `${filesProcessed.toLocaleString()} of ${filesTotal.toLocaleString()} files`
            : "Reading repository tree…"}
        </span>
        <span className="tabular-nums">
          {known ? `${percent}%` : ""}
          {chunkCount > 0 && ` · ${chunkCount.toLocaleString()} chunks`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Indexing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? percent : undefined}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {known ? (
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="absolute inset-y-0 w-1/3 animate-[index-indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-sky-500/70" />
        )}
      </div>
    </div>
  )
}
