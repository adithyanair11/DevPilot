import Link from "next/link"
import { CodeXmlIcon } from "lucide-react"
import { cn } from "cn"

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md font-heading text-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CodeXmlIcon className="size-4.5" />
      </span>
      DevPilot
    </Link>
  )
}
