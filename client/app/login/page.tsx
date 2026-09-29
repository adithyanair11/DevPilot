import type { Metadata } from "next"

import { LoginCard } from "@/components/auth/login-card"
import { AnswerPreview } from "@/components/auth/answer-preview"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Logo } from "@/components/brand/logo"

export const metadata: Metadata = {
  title: "Sign in · DevPilot",
  description: "Sign in with GitHub to chat with your codebases.",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams
  const errorCode = typeof error === "string" ? error : undefined

  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      {/* Left: sign-in */}
      <section className="flex flex-col p-6 md:p-10">
        <header className="flex items-center justify-between">
          <Logo />
          <ModeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <LoginCard error={errorCode} />
        </div>

        <footer className="text-center text-xs text-muted-foreground lg:text-left">
          Answers are grounded in your repository&apos;s code, with file and line citations.
        </footer>
      </section>

      {/* Right: product preview (desktop only) */}
      <section className="relative hidden overflow-hidden border-l bg-muted/40 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]"
          aria-hidden="true"
        />
        <div className="relative flex w-full flex-col items-center gap-10">
          <div className="max-w-md space-y-2 text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Ask your codebase anything
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick a repository, ask in plain English, and get answers that cite the
              exact files and lines they came from.
            </p>
          </div>
          <AnswerPreview />
        </div>
      </section>
    </main>
  )
}
