"use client"

import * as React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CheckIcon, CopyIcon } from "lucide-react"
import { cn } from "cn"

import { CitationChip } from "@/components/chat/citations"

// ---------------------------------------------------------------------------
// remark plugin: turn "[3]" in plain text into citation links (#cite-3).
// Code spans/blocks are separate node types, so markers inside code are untouched.
// ---------------------------------------------------------------------------

type MdNode = { type: string; value?: string; url?: string; children?: MdNode[] }

const CITATION_RE = /\[(\d{1,2})\]/g

function splitCitations(value: string): MdNode[] | null {
  CITATION_RE.lastIndex = 0
  if (!CITATION_RE.test(value)) return null
  CITATION_RE.lastIndex = 0
  const out: MdNode[] = []
  let last = 0
  for (const match of value.matchAll(CITATION_RE)) {
    const start = match.index ?? 0
    if (start > last) out.push({ type: "text", value: value.slice(last, start) })
    out.push({ type: "link", url: `#cite-${match[1]}`, children: [{ type: "text", value: match[1] }] })
    last = start + match[0].length
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) })
  return out
}

function walk(node: MdNode) {
  if (!node.children || node.type === "link" || node.type === "linkReference") return
  const next: MdNode[] = []
  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      const parts = splitCitations(child.value)
      if (parts) {
        next.push(...parts)
        continue
      }
    }
    walk(child)
    next.push(child)
  }
  node.children = next
}

function remarkCitations() {
  return (tree: MdNode) => walk(tree)
}

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------

function CopyButton({ text, label = "Copy code", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

export { CopyButton }

function CodeBlock({ language, code }: { language?: string; code: string }) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border bg-muted/40 first:mt-0 last:mb-0">
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1">
        <span className="font-mono text-[11px] text-muted-foreground">{language ?? "code"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Element styling (no typography plugin in this project)
// ---------------------------------------------------------------------------

const components: Components = {
  pre({ children }) {
    const child = React.Children.toArray(children)[0] as
      | React.ReactElement<{ className?: string; children?: React.ReactNode }>
      | undefined
    const className = child?.props?.className ?? ""
    const language = /language-([\w+#-]+)/.exec(className)?.[1]
    const code = String(child?.props?.children ?? "").replace(/\n$/, "")
    return <CodeBlock language={language} code={code} />
  },
  code({ className, children }) {
    return (
      <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)}>{children}</code>
    )
  },
  a({ href, children }) {
    if (href?.startsWith("#cite-")) {
      return <CitationChip index={Number(href.slice(6))} />
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
        {children}
      </a>
    )
  },
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-7 [&>p]:my-1">{children}</li>,
  h1: ({ children }) => <h3 className="mt-5 mb-2 font-heading text-lg font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-5 mb-2 font-heading text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-2 font-heading text-sm font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-4 mb-2 text-sm font-semibold first:mt-0">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-4" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-muted/50 px-3 py-1.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-3 py-1.5 align-top">{children}</td>,
}

const remarkPlugins = [remarkGfm, remarkCitations]

/** Renders an assistant answer. Safe to call on every streamed update. */
export const Markdown = React.memo(function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("min-w-0 text-sm wrap-break-word", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
