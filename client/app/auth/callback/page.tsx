"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircleIcon, RotateCwIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Logo } from "@/components/brand/logo"
import { authKeys } from "@/hooks/use-auth"
import { consumeReturnTo, fetchCurrentUser } from "@/lib/auth"

/**
 * Spring Security redirects here after a successful GitHub OAuth login.
 * We confirm the session cookie works by calling /api/auth/me, seed the
 * user cache, then send the user on to where they were headed.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false

    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return
        if (!user) {
          router.replace("/login?error=oauth_failed")
          return
        }
        queryClient.setQueryData(authKeys.me, user)
        router.replace(consumeReturnTo())
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [attempt, queryClient, router])

  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 p-6">
      <Logo />
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <AlertCircleIcon className="size-8 text-destructive" />
          <div className="space-y-1">
            <h1 className="font-heading text-xl font-semibold">We couldn&apos;t finish signing you in</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setError(null)
                setAttempt((n) => n + 1)
              }}
            >
              <RotateCwIcon />
              Try again
            </Button>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground" role="status">
          <Spinner className="size-5" />
          <span>Signing you in…</span>
        </div>
      )}
    </main>
  )
}
