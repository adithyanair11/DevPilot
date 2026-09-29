"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { GithubIcon } from "@/components/auth/github-icon"
import { useCurrentUser } from "@/hooks/use-auth"
import { GITHUB_LOGIN_URL, consumeReturnTo } from "@/lib/auth"

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed:
    "GitHub sign-in didn't complete. Please try again, and make sure you approve access on GitHub.",
  session_expired: "Your session has expired. Please sign in again.",
}

type LoginCardProps = {
  error?: string
}

export function LoginCard({ error }: LoginCardProps) {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const [redirecting, setRedirecting] = React.useState(false)

  // Already signed in? Skip the login screen.
  React.useEffect(() => {
    if (user) router.replace(consumeReturnTo())
  }, [user, router])

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong while signing in. Please try again.")
    : null

  function handleSignIn() {
    setRedirecting(true)
    // Spring Security runs the GitHub OAuth flow and redirects back to
    // `${FRONTEND_URL}/auth/callback` on success.
    window.location.href = GITHUB_LOGIN_URL
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Sign in to DevPilot
        </h1>
        <p className="text-muted-foreground">
          Connect your GitHub account to ask questions about your repositories
          in plain English.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircleIcon />
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className="h-11 w-full gap-2 bg-foreground text-background hover:bg-foreground/85"
        onClick={handleSignIn}
        disabled={redirecting}
      >
        {redirecting ? (
          <>
            <Spinner />
            Redirecting to GitHub…
          </>
        ) : (
          <>
            <GithubIcon className="size-5" />
            Continue with GitHub
          </>
        )}
      </Button>

      <div className="mt-6 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          DevPilot requests <code className="font-mono text-foreground">read:user</code>{" "}
          and <code className="font-mono text-foreground">repo</code> access so it can
          read your public and private repositories. Your access token is encrypted
          at rest and never shared.
        </p>
      </div>
    </div>
  )
}
