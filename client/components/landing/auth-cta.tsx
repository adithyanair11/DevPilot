"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { GithubIcon } from "@/components/auth/github-icon"
import { useCurrentUser } from "@/hooks/use-auth"
import { DEFAULT_AUTHED_ROUTE } from "@/lib/auth"

type AuthCtaProps = {
  variant?: "header" | "hero"
  className?: string
}

/** "Sign in" for visitors, "Open DevPilot" for signed-in users. */
export function AuthCta({ variant = "hero", className }: AuthCtaProps) {
  const { data: user } = useCurrentUser()
  const signedIn = !!user

  if (variant === "header") {
    return (
      <Link
        href={signedIn ? DEFAULT_AUTHED_ROUTE : "/login"}
        className={cn(buttonVariants({ variant: signedIn ? "default" : "outline", size: "sm" }), className)}
      >
        {signedIn ? "Open DevPilot" : "Sign in"}
      </Link>
    )
  }

  return (
    <Link
      href={signedIn ? DEFAULT_AUTHED_ROUTE : "/login"}
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-11 gap-2 bg-foreground px-5 text-background hover:bg-foreground/85",
        className
      )}
    >
      {signedIn ? (
        <>
          Open DevPilot
          <ArrowRightIcon />
        </>
      ) : (
        <>
          <GithubIcon className="size-5" />
          Sign in with GitHub
        </>
      )}
    </Link>
  )
}
