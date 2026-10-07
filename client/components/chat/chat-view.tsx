"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  DatabaseZapIcon,
  HistoryIcon,
  SparklesIcon,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatComposer, type ChatComposerHandle } from "@/components/chat/chat-composer"
import { MessageList, PendingTurnView, TurnErrorView } from "@/components/chat/chat-messages"
import { SessionSidebar } from "@/components/chat/session-sidebar"
import { StatusBadge } from "@/components/repos/status-badge"
import { useChatSession, useChatStream } from "@/hooks/use-chat"
import { ApiError } from "@/lib/api"
import type { Repository } from "@/lib/repos"

const SUGGESTIONS = [
  "Give me an overview of how this codebase is organised.",
  "Where is authentication handled?",
  "How are errors handled and returned to the client?",
  "What happens when the application starts?",
]

/** Distance from the bottom (px) within which we keep following new tokens. */
const STICK_THRESHOLD = 96

export function ChatView({ repo, sessionId }: { repo: Repository; sessionId: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const stream = useChatStream(repo.id)
  const session = useChatSession(sessionId)
  const composerRef = React.useRef<ChatComposerHandle>(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = React.useState(true)
  const stickRef = React.useRef(true)

  const ready = repo.indexStatus === "READY"
  const messages = session.data?.messages ?? []
  const hasThread = messages.length > 0 || stream.pending !== null || stream.error !== null

  const goTo = React.useCallback(
    (id: string | null) => {
      router.replace(id ? `${pathname}?s=${id}` : pathname, { scroll: false })
    },
    [pathname, router]
  )

  const selectSession = (id: string | null) => {
    if (stream.isStreaming) stream.stop()
    stream.reset()
    setHistoryOpen(false)
    goTo(id)
    if (!id) requestAnimationFrame(() => composerRef.current?.focus())
  }

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // Follow the answer while it streams, unless the user scrolled up to read.
  React.useLayoutEffect(() => {
    if (stickRef.current) scrollToBottom("auto")
  }, [stream.pending, messages.length, scrollToBottom])

  // Jump to the end when opening a session.
  React.useEffect(() => {
    stickRef.current = true
    requestAnimationFrame(() => scrollToBottom("auto"))
  }, [sessionId, session.isSuccess, scrollToBottom])

  const ask = (question: string) => {
    stickRef.current = true
    setAtBottom(true)
    void stream.send(question, {
      sessionId,
      onSessionCreated: (created) => goTo(created.id),
    })
  }

  const sidebar = (
    <SessionSidebar repoId={repo.id} activeId={sessionId} onSelect={selectSession} className="h-full" />
  )

  return (
    <div className="grid h-[calc(100svh-3.5rem-4rem)] min-h-[28rem] grid-cols-1 gap-6 md:grid-cols-[15rem_1fr]">
      <aside className="hidden min-h-0 md:flex md:flex-col">{sidebar}</aside>

      <section className="flex min-h-0 min-w-0 flex-col" aria-label={`Chat about ${repo.fullName}`}>
        {/* Header */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Link
            href={`/repos/${repo.id}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label={`Back to ${repo.fullName}`}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-muted-foreground">{repo.fullName}</p>
            <h1 className="truncate font-heading text-base font-semibold">
              {session.data?.session.title ?? (sessionId ? " " : "New chat")}
            </h1>
          </div>
          <StatusBadge status={repo.indexStatus} errorMessage={repo.errorMessage} className="hidden sm:inline-flex" />
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger render={<Button variant="outline" size="sm" className="md:hidden" />}>
              <HistoryIcon />
              Chats
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Chats</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Thread */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget
              const near = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
              stickRef.current = near
              setAtBottom(near)
            }}
            className="h-full overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-1 py-6" aria-live="polite">
              {!ready ? (
                <NotReady repo={repo} />
              ) : session.isError ? (
                <SessionError error={session.error} onNew={() => selectSession(null)} />
              ) : sessionId && session.isPending ? (
                <ThreadSkeleton />
              ) : !hasThread ? (
                <Welcome repo={repo} onPick={ask} />
              ) : (
                <>
                  <MessageList messages={messages} repo={repo} />
                  {stream.pending && <PendingTurnView turn={stream.pending} repo={repo} />}
                  {stream.error && !stream.pending && (
                    <TurnErrorView error={stream.error} onRetry={() => ask(stream.error!.question)} />
                  )}
                </>
              )}
            </div>
          </div>

          {!atBottom && hasThread && (
            <Button
              size="icon-sm"
              variant="outline"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-md"
              onClick={() => {
                stickRef.current = true
                scrollToBottom()
              }}
              aria-label="Scroll to latest message"
            >
              <ArrowDownIcon />
            </Button>
          )}
        </div>

        {/* Composer */}
        <div className="mx-auto w-full max-w-3xl pt-2">
          <ChatComposer
            ref={composerRef}
            onSend={ask}
            onStop={stream.stop}
            streaming={stream.isStreaming}
            disabled={!ready || session.isError}
            autoFocus
            placeholder={ready ? `Ask about ${repo.name}…` : "Index this repository to start chatting"}
          />
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Answers are based on retrieved code and can be wrong. Check the cited sources.
          </p>
        </div>
      </section>
    </div>
  )
}

function Welcome({ repo, onPick }: { repo: Repository; onPick: (q: string) => void }) {
  return (
    <div className="m-auto flex w-full max-w-xl flex-col items-center gap-6 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SparklesIcon className="size-5" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Ask anything about {repo.name}</h2>
        <p className="text-sm text-muted-foreground">
          Answers come from {repo.chunkCount.toLocaleString()} indexed chunks across{" "}
          {repo.filesProcessed.toLocaleString()} files, with citations to the exact source.
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-xl border bg-card px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function NotReady({ repo }: { repo: Repository }) {
  return (
    <Empty className="m-auto border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DatabaseZapIcon />
        </EmptyMedia>
        <EmptyTitle>
          {repo.indexStatus === "INDEXING" ? "Indexing in progress" : "This repository isn't indexed yet"}
        </EmptyTitle>
        <EmptyDescription>
          {repo.indexStatus === "INDEXING"
            ? "You can start chatting as soon as indexing finishes."
            : "Index it first so DevPilot can find the relevant code for your questions."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={`/repos/${repo.id}`} className={buttonVariants({ variant: "outline" })}>
          Go to repository
        </Link>
      </EmptyContent>
    </Empty>
  )
}

function SessionError({ error, onNew }: { error: Error; onNew: () => void }) {
  const missing = error instanceof ApiError && error.status === 404
  return (
    <Empty className="m-auto border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircleIcon className="text-destructive" />
        </EmptyMedia>
        <EmptyTitle>{missing ? "Chat not found" : "Couldn't load this chat"}</EmptyTitle>
        <EmptyDescription>{missing ? "It may have been deleted." : error.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onNew}>
          Start a new chat
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="ml-auto h-10 w-2/3 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
    </div>
  )
}
