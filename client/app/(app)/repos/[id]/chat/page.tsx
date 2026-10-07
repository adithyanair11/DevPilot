"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { AlertCircleIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatView } from "@/components/chat/chat-view"
import { useIndexStatus, useRepo } from "@/hooks/use-repos"

function ChatPageInner() {
  const { id } = useParams<{ id: string }>()
  // The session lives in ?s= so starting a chat doesn't remount the page mid-stream.
  const sessionId = useSearchParams().get("s")
  const { data: repo, isPending, isError, error } = useRepo(id)
  useIndexStatus(repo)

  if (isPending) {
    return (
      <div className="grid h-[calc(100svh-3.5rem-4rem)] gap-6 md:grid-cols-[15rem_1fr]" aria-hidden="true">
        <Skeleton className="hidden h-full md:block" />
        <Skeleton className="h-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircleIcon className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle>Couldn&apos;t open this repository</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to repositories
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  return <ChatView repo={repo} sessionId={sessionId} />
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={null}>
      <ChatPageInner />
    </React.Suspense>
  )
}
