"use client"

import * as React from "react"
import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

const MAX_LENGTH = 2000

type ChatComposerProps = {
  onSend: (question: string) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export type ChatComposerHandle = { setValue: (value: string) => void; focus: () => void }

export const ChatComposer = React.forwardRef<ChatComposerHandle, ChatComposerProps>(function ChatComposer(
  { onSend, onStop, streaming, disabled, placeholder, autoFocus },
  ref
) {
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useImperativeHandle(ref, () => ({
    setValue,
    focus: () => textareaRef.current?.focus(),
  }))

  const trimmed = value.trim()
  const canSend = !disabled && !streaming && trimmed.length > 0

  function submit() {
    if (!canSend) return
    onSend(trimmed)
    setValue("")
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        "rounded-2xl border bg-card p-2 shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/30",
        disabled && "opacity-60"
      )}
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about this repository
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        value={value}
        maxLength={MAX_LENGTH}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter adds a line. Ignore Enter while composing (IME).
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder ?? "Ask about this repository…"}
        className="field-sizing-content block max-h-48 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] text-muted-foreground">
          {value.length > MAX_LENGTH - 200 ? (
            `${value.length}/${MAX_LENGTH}`
          ) : (
            <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
          )}
        </span>
        {streaming ? (
          <Button type="button" size="icon-sm" variant="outline" onClick={onStop} aria-label="Stop generating">
            <SquareIcon className="fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon-sm" disabled={!canSend} aria-label="Send question">
            <ArrowUpIcon />
          </Button>
        )}
      </div>
    </form>
  )
})
