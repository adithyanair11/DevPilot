"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import {
  createChatSession,
  deleteChatSession,
  fetchChatSession,
  listChatSessions,
  streamChatAnswer,
  type ChatMessage,
  type ChatSession,
  type ChatSessionDetail,
} from "@/lib/chat"
import type { Citation } from "@/lib/repos"

export const chatKeys = {
  all: ["chat"] as const,
  sessions: (repoId: string) => [...chatKeys.all, "sessions", repoId] as const,
  session: (sessionId: string) => [...chatKeys.all, "session", sessionId] as const,
}

const notFound = (error: Error) => error instanceof ApiError && error.status >= 400 && error.status < 500

export function useChatSessions(repoId: string) {
  return useQuery({
    queryKey: chatKeys.sessions(repoId),
    queryFn: () => listChatSessions(repoId),
    staleTime: 30 * 1000,
  })
}

export function useChatSession(sessionId: string | null) {
  return useQuery({
    queryKey: chatKeys.session(sessionId ?? "none"),
    queryFn: () => fetchChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 60 * 1000,
    retry: (count, error) => count < 2 && !notFound(error),
  })
}

export function useDeleteChatSession(repoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<ChatSession[]>(chatKeys.sessions(repoId), (list) =>
        list?.filter((s) => s.id !== sessionId)
      )
      queryClient.removeQueries({ queryKey: chatKeys.session(sessionId) })
    },
    onError: (error: Error) => {
      toast.add({ type: "error", title: "Couldn't delete chat", description: error.message, timeout: 5000 })
    },
  })
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export type PendingTurn = {
  question: string
  /** null until the backend confirms the saved question. */
  userMessage: ChatMessage | null
  answer: string
  /** null while code is still being retrieved. */
  citations: Citation[] | null
  status: "starting" | "streaming"
}

export type TurnError = {
  message: string
  question: string
}

function localMessage(role: ChatMessage["role"], content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `local-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    citations: [],
    incomplete: false,
    createdAt: new Date().toISOString(),
    ...extra,
  }
}

type SendOptions = {
  sessionId: string | null
  /** Called right after a new session is created for the first question. */
  onSessionCreated?: (session: ChatSession) => void
}

/**
 * Sends a question and streams the answer. Token updates are batched per animation
 * frame so long answers don't re-render (and re-parse Markdown) on every token.
 */
export function useChatStream(repoId: string) {
  const queryClient = useQueryClient()
  const [pending, setPending] = React.useState<PendingTurn | null>(null)
  const [error, setError] = React.useState<TurnError | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)
  const turnRef = React.useRef<PendingTurn | null>(null)
  const sessionRef = React.useRef<string | null>(null)
  const frameRef = React.useRef<number | null>(null)

  const flush = React.useCallback(() => {
    frameRef.current = null
    setPending(turnRef.current ? { ...turnRef.current } : null)
  }, [])

  const scheduleFlush = React.useCallback(() => {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(flush)
  }, [flush])

  const appendToSession = React.useCallback(
    (sessionId: string, messages: ChatMessage[], session?: ChatSession) => {
      queryClient.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), (detail) =>
        detail
          ? {
              session: session ?? detail.session,
              messages: [...detail.messages.filter((m) => !messages.some((n) => n.id === m.id)), ...messages],
            }
          : detail
      )
    },
    [queryClient]
  )

  /** Ends the turn locally (stop/error), keeping whatever was streamed, then syncs with the server. */
  const finishLocally = React.useCallback(
    (sessionId: string) => {
      const turn = turnRef.current
      turnRef.current = null
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      setPending(null)
      if (turn) {
        const messages = [turn.userMessage ?? localMessage("USER", turn.question)]
        if (turn.answer) {
          messages.push(
            localMessage("ASSISTANT", turn.answer, { citations: turn.citations ?? [], incomplete: true })
          )
        }
        appendToSession(sessionId, messages)
      }
      // The backend saves the question and any partial answer; replace local copies with the real ones.
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) })
        queryClient.invalidateQueries({ queryKey: chatKeys.sessions(repoId) })
      }, 1000)
    },
    [appendToSession, queryClient, repoId]
  )

  const send = React.useCallback(
    async (rawQuestion: string, { sessionId, onSessionCreated }: SendOptions) => {
      const question = rawQuestion.trim()
      if (!question || turnRef.current) return

      setError(null)
      turnRef.current = { question, userMessage: null, answer: "", citations: null, status: "starting" }
      setPending({ ...turnRef.current })

      let id = sessionId
      try {
        if (!id) {
          const session = await createChatSession(repoId)
          id = session.id
          queryClient.setQueryData<ChatSessionDetail>(chatKeys.session(id), { session, messages: [] })
          queryClient.setQueryData<ChatSession[]>(chatKeys.sessions(repoId), (list) => [session, ...(list ?? [])])
          sessionRef.current = id
          onSessionCreated?.(session)
        }
      } catch (err) {
        turnRef.current = null
        setPending(null)
        setError({ message: (err as Error).message, question })
        return
      }

      const controller = new AbortController()
      abortRef.current = controller
      sessionRef.current = id
      const streamSession = id
      let finished = false

      try {
        await streamChatAnswer(
          streamSession,
          question,
          {
            onMeta: ({ session, userMessage }) => {
              if (!turnRef.current) return
              turnRef.current.userMessage = userMessage
              queryClient.setQueryData<ChatSessionDetail>(chatKeys.session(streamSession), (d) =>
                d ? { ...d, session } : d
              )
              queryClient.setQueryData<ChatSession[]>(chatKeys.sessions(repoId), (list) =>
                list ? [session, ...list.filter((s) => s.id !== session.id)] : list
              )
              scheduleFlush()
            },
            onCitations: (citations) => {
              if (!turnRef.current) return
              turnRef.current.citations = citations
              scheduleFlush()
            },
            onToken: (text) => {
              if (!turnRef.current) return
              turnRef.current.answer += text
              turnRef.current.status = "streaming"
              scheduleFlush()
            },
            onDone: (message) => {
              finished = true
              const turn = turnRef.current
              turnRef.current = null
              if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
              frameRef.current = null
              setPending(null)
              appendToSession(streamSession, [turn?.userMessage ?? localMessage("USER", question), message])
              queryClient.invalidateQueries({ queryKey: chatKeys.sessions(repoId) })
            },
            onError: (message) => {
              finished = true
              finishLocally(streamSession)
              setError({ message, question })
            },
          },
          controller.signal
        )
        if (!finished && turnRef.current) {
          // Stream closed without a done/error event.
          finishLocally(streamSession)
          setError({ message: "The connection closed before the answer finished.", question })
        }
      } catch (err) {
        if (controller.signal.aborted) {
          finishLocally(streamSession)
        } else {
          const apiError = err as ApiError
          turnRef.current = null
          setPending(null)
          setError({ message: apiError.message, question })
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [appendToSession, finishLocally, queryClient, repoId, scheduleFlush]
  )

  const stop = React.useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = React.useCallback(() => {
    abortRef.current?.abort()
    setError(null)
  }, [])

  // Abort an in-flight answer if the component unmounts.
  React.useEffect(() => () => abortRef.current?.abort(), [])

  return {
    send,
    stop,
    reset,
    pending,
    error,
    isStreaming: pending !== null,
  }
}
