"use client"

import * as React from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { MessageSquareIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useChatSessions, useDeleteChatSession } from "@/hooks/use-chat"
import type { ChatSession } from "@/lib/chat"

type SessionSidebarProps = {
  repoId: string
  activeId: string | null
  onSelect: (sessionId: string | null) => void
  className?: string
}

export function SessionSidebar({ repoId, activeId, onSelect, className }: SessionSidebarProps) {
  const { data: sessions, isPending, isError, refetch } = useChatSessions(repoId)
  const deleteSession = useDeleteChatSession(repoId)
  const [toDelete, setToDelete] = React.useState<ChatSession | null>(null)

  return (
    <nav aria-label="Chat history" className={cn("flex min-h-0 flex-col gap-3", className)}>
      <Button variant="outline" className="w-full justify-start" onClick={() => onSelect(null)}>
        <PlusIcon />
        New chat
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="space-y-2 px-1 text-xs text-muted-foreground">
            <p>Couldn&apos;t load chats.</p>
            <Button size="xs" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">No chats yet. Ask a question to start one.</p>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((session) => {
              const active = session.id === activeId
              return (
                <li key={session.id} className="group/session relative">
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 pr-8 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active ? "bg-muted font-medium" : "hover:bg-muted/60"
                    )}
                  >
                    <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{session.title}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(session.updatedAt), { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(session)}
                    aria-label={`Delete chat “${session.title}”`}
                    className="absolute top-2 right-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity outline-none group-hover/session:opacity-100 hover:bg-background hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current]:opacity-100"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” and its messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return
                const id = toDelete.id
                deleteSession.mutate(id, {
                  onSuccess: () => {
                    if (id === activeId) onSelect(null)
                  },
                })
                setToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
