import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api"
import type { Citation } from "@/lib/repos"

/** Mirrors backend `ChatSessionResponse`. */
export type ChatSession = {
  id: string
  repositoryId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ChatRole = "USER" | "ASSISTANT"

/** Mirrors backend `ChatMessageResponse`. */
export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  citations: Citation[]
  /** True when the answer stopped early (user pressed stop, disconnect or model error). */
  incomplete: boolean
  createdAt: string
}

/** Mirrors backend `ChatSessionDetailResponse`. */
export type ChatSessionDetail = {
  session: ChatSession
  messages: ChatMessage[]
}

export function listChatSessions(repoId: string) {
  return apiFetch<ChatSession[]>(`/api/repos/${encodeURIComponent(repoId)}/chat/sessions`)
}

export function createChatSession(repoId: string, title?: string) {
  return apiFetch<ChatSession>(`/api/repos/${encodeURIComponent(repoId)}/chat/sessions`, {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
  })
}

export function fetchChatSession(sessionId: string) {
  return apiFetch<ChatSessionDetail>(`/api/chat/sessions/${encodeURIComponent(sessionId)}`)
}

export function deleteChatSession(sessionId: string) {
  return apiFetch<void>(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Streaming answers (Server-Sent Events over a POST, so fetch instead of EventSource)
// ---------------------------------------------------------------------------

export type ChatStreamHandlers = {
  onMeta?: (meta: { session: ChatSession; userMessage: ChatMessage }) => void
  onCitations?: (citations: Citation[]) => void
  onToken?: (text: string) => void
  onDone?: (message: ChatMessage) => void
  onError?: (message: string) => void
}

/**
 * POSTs a question and dispatches the SSE events as they arrive.
 * Resolves when the stream ends; rejects with ApiError if the request is refused
 * before streaming starts (validation, auth, not indexed). Abort via `signal`.
 */
export async function streamChatAnswer(
  sessionId: string,
  question: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let res: Response
  try {
    res = await fetch(
      `${API_BASE_URL}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question }),
        signal,
      }
    )
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ApiError(0, "Can't reach the DevPilot server. Is the backend running?")
  }

  if (!res.ok || !res.body) {
    let message = res.statusText || `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* empty body */
    }
    throw new ApiError(res.status, message)
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""

  const dispatch = (raw: string) => {
    let event = "message"
    const data: string[] = []
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim()
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""))
    }
    if (data.length === 0) return
    let payload: unknown
    try {
      payload = JSON.parse(data.join("\n"))
    } catch {
      return
    }
    switch (event) {
      case "meta":
        handlers.onMeta?.(payload as { session: ChatSession; userMessage: ChatMessage })
        break
      case "citations":
        handlers.onCitations?.(payload as Citation[])
        break
      case "token":
        handlers.onToken?.((payload as { text: string }).text)
        break
      case "done":
        handlers.onDone?.((payload as { message: ChatMessage }).message)
        break
      case "error":
        handlers.onError?.((payload as { message: string }).message)
        break
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value.replace(/\r\n/g, "\n")
    let boundary: number
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      dispatch(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
    }
  }
  if (buffer.trim()) dispatch(buffer)
}
