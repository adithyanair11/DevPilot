"use client"

import { DatabaseZapIcon, RefreshCwIcon, RotateCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useIndexRepo } from "@/hooks/use-repos"
import type { Repository } from "@/lib/repos"

type IndexButtonProps = {
  repo: Repository
  size?: "sm" | "default"
  className?: string
}

/** Index / Re-index / Retry, depending on the repository's status. */
export function IndexButton({ repo, size = "sm", className }: IndexButtonProps) {
  const indexRepo = useIndexRepo()
  const busy = repo.indexStatus === "INDEXING" || indexRepo.isPending

  const { label, icon: Icon, variant } =
    repo.indexStatus === "READY"
      ? { label: "Re-index", icon: RefreshCwIcon, variant: "outline" as const }
      : repo.indexStatus === "FAILED"
        ? { label: "Retry", icon: RotateCwIcon, variant: "outline" as const }
        : { label: "Index", icon: DatabaseZapIcon, variant: "default" as const }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        indexRepo.mutate(repo)
      }}
      aria-label={`${label} ${repo.fullName}`}
    >
      {busy ? <Spinner /> : <Icon />}
      {busy ? "Indexing…" : label}
    </Button>
  )
}
