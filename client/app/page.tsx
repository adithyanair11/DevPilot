import type { Metadata } from "next"
import Link from "next/link"
import {
  DatabaseZapIcon,
  FileSearchIcon,
  GitForkIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  QuoteIcon,
} from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { AuthCta } from "@/components/landing/auth-cta"
import { HeroPreview } from "@/components/landing/hero-preview"
import { ModeToggle } from "@/components/ui/mode-toggle"

export const metadata: Metadata = {
  title: "DevPilot — Chat with your GitHub codebases",
  description:
    "Sign in with GitHub, pick a repository, and ask questions about the code in plain English. Every answer cites the exact files and lines it came from.",
}

const steps = [
  {
    title: "Sign in with GitHub",
    body: "Connect your account with OAuth. DevPilot can see your public and private repositories.",
  },
  {
    title: "Pick a repository",
    body: "DevPilot reads the code, splits it into overlapping chunks and stores their embeddings for search.",
  },
  {
    title: "Ask in plain English",
    body: "The most relevant chunks are retrieved and used to write an answer, with citations back to the source.",
  },
]

const features = [
  {
    icon: QuoteIcon,
    title: "Answers grounded in your code",
    body: "Responses are built only from the selected repository, not from guesses about how code usually looks.",
  },
  {
    icon: FileSearchIcon,
    title: "File and line citations",
    body: "Every answer points to the exact files and line ranges it used, so you can check it yourself.",
  },
  {
    icon: GitForkIcon,
    title: "Public and private repos",
    body: "Work with any repository your GitHub account can access, including private ones.",
  },
  {
    icon: DatabaseZapIcon,
    title: "Semantic search with pgvector",
    body: "Code chunks are embedded and searched by meaning in PostgreSQL, so questions don't need exact keywords.",
  },
  {
    icon: MessageSquareTextIcon,
    title: "Built for onboarding",
    body: "Get up to speed on an unfamiliar codebase by asking how things work instead of grepping for hours.",
  },
  {
    icon: LockKeyholeIcon,
    title: "Secure by default",
    body: "GitHub tokens are encrypted at rest and your session lives in an HTTP-only cookie.",
  },
]

const stack = ["Spring Boot", "Spring Security", "Spring AI", "PostgreSQL + pgvector", "Next.js"]

export default function Home() {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <AuthCta variant="header" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Retrieval-augmented answers for your repos
              </span>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Ask your codebase anything.
              </h1>
              <p className="max-w-lg text-lg text-pretty text-muted-foreground">
                DevPilot lets you pick any of your GitHub repositories and ask questions about
                the code in plain English. Every answer cites the exact files and lines it came from.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <AuthCta />
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  See how it works
                </a>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 max-w-xl space-y-2">
              <h2 className="font-heading text-3xl font-semibold tracking-tight">How it works</h2>
              <p className="text-muted-foreground">From sign-in to a cited answer in three steps.</p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-xl border bg-card p-6">
                  <span className="mb-4 flex size-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="mb-1.5 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="mb-10 max-w-xl space-y-2">
              <h2 className="font-heading text-3xl font-semibold tracking-tight">
                Answers you can check
              </h2>
              <p className="text-muted-foreground">
                DevPilot is built to be trusted: it shows its sources instead of asking you to take its word for it.
              </p>
            </div>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="space-y-2">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                    <Icon className="size-4.5 text-primary" />
                  </span>
                  <h3 className="font-heading text-base font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stack + CTA */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center md:px-6 md:py-20">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
                Start asking questions about your code
              </h2>
              <p className="text-muted-foreground">All you need is a GitHub account.</p>
            </div>
            <AuthCta />
            <ul className="flex flex-wrap justify-center gap-2" aria-label="Built with">
              {stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border bg-background px-3 py-1 font-mono text-xs text-muted-foreground"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row md:px-6">
          <span>© {new Date().getFullYear()} DevPilot</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
