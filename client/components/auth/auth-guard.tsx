"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AlertCircleIcon, RotateCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser } from "@/hooks/use-auth"
import { saveReturnTo } from "@/lib/auth"

/**
 * Client-side gate for signed-in pages. The session cookie belongs to the
 * backend origin, so the browser asking /api/auth/me is the source of truth.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: user, error, isPending, refetch, isRefetching } = useCurrentUser()

  React.useEffect(() => {
    if (user === null) {
      saveReturnTo(pathname + window.location.search)
      router.replace("/login")
    }
  }, [user, pathname, router])

  if (user) return <>{children}</>

  if (error && !isPending) {
    return (
      <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircleIcon className="size-8 text-destructive" />
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? <Spinner /> : <RotateCwIcon />}
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center" role="status">
      <Spinner className="size-6 text-muted-foreground" />
      <span className="sr-only">Checking your session…</span>
    </div>
  )
}
