"use client"

import { RepoDashboard } from "@/components/repos/repo-dashboard"
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

      <RepoDashboard />
    </div>
  )
}
