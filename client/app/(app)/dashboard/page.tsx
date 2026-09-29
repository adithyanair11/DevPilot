"use client"

import { FolderGit2Icon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useCurrentUser } from "@/hooks/use-auth"

export default function DashboardPage() {
  const { data: user } = useCurrentUser()
  const firstName = user?.displayName?.split(" ")[0] || user?.githubUsername

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Pick a repository to index, then ask questions about its code.
        </p>
      </div>

      {/* Placeholder until the repositories API and UI are built. */}
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2Icon />
          </EmptyMedia>
          <EmptyTitle>Your repositories will show up here</EmptyTitle>
          <EmptyDescription>
            Repository browsing and indexing are coming next.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
