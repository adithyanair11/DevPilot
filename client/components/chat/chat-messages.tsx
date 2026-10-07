"use client"

import * as React from "react"
import { AlertCircleIcon, RotateCwIcon, SparklesIcon } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AnswerWithSources } from "@/components/chat/citations"
import { CopyButton, Markdown } from "@/components/chat/markdown"
import type { PendingTurn, TurnError } from "@/hooks/use-chat"
import type { ChatMessage } from "@/lib/chat"
import type { Repository } from "@/lib/repos"

function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <SparklesIcon className="size-3.5" />
    </span>
  )
}

export function UserTurn({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <Bubble variant="default" align="end" className="max-w-[85%] sm:max-w-[75%]">
        <BubbleContent className="px-3.5 py-2 whitespace-pre-wrap">{content}</BubbleContent>
      </Bubble>
    </div>
  )
}

type AssistantTurnProps = {
  messageId: string
  content: string
  citations: ChatMessage["citations"]
  repo: Repository
  incomplete?: boolean
  streaming?: boolean
}

export function AssistantTurn({ messageId, content, citations, repo, incomplete, streaming }: AssistantTurnProps) {
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        <AnswerWithSources messageId={messageId} content={content} citations={citations} repo={repo}>
          <Markdown content={content} />
          {streaming && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/60"
            />
          )}
        </AnswerWithSources>
        {!streaming && (
          <div className="mt-2 flex items-center gap-2">
            <CopyButton text={content} label="Copy answer" className="-ml-1.5" />
            {incomplete && (
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Stopped early
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** The question + answer currently being streamed. */
export function PendingTurnView({ turn, repo }: { turn: PendingTurn; repo: Repository }) {
  return (
    <div className="space-y-6">
      <UserTurn content={turn.question} />
      {turn.answer ? (
        <AssistantTurn
          messageId="pending"
          content={turn.answer}
          citations={turn.citations ?? []}
          repo={repo}
          streaming
        />
      ) : (
        <div className="flex gap-3" role="status">
          <AssistantAvatar />
          <p className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
            <Spinner className="size-3.5" />
            {turn.citations === null
              ? "Searching the code…"
              : turn.citations.length > 0
                ? `Found ${turn.citations.length} relevant ${turn.citations.length === 1 ? "chunk" : "chunks"} · writing answer…`
                : "No matching code found · writing answer…"}
          </p>
        </div>
      )}
    </div>
  )
}

export function TurnErrorView({ error, onRetry }: { error: TurnError; onRetry: () => void }) {
  return (
    <div className="flex gap-3" role="alert">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircleIcon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCwIcon />
          Try again
        </Button>
      </div>
    </div>
  )
}

export function MessageList({ messages, repo }: { messages: ChatMessage[]; repo: Repository }) {
  return (
    <>
      {messages.map((m) =>
        m.role === "USER" ? (
          <UserTurn key={m.id} content={m.content} />
        ) : (
          <AssistantTurn
            key={m.id}
            messageId={m.id}
            content={m.content}
            citations={m.citations}
            repo={repo}
            incomplete={m.incomplete}
          />
        )
      )}
    </>
  )
}
