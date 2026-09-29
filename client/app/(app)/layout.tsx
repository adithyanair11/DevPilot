import { AuthGuard } from "@/components/auth/auth-guard"
import { UserMenu } from "@/components/auth/user-menu"
import { Logo } from "@/components/brand/logo"
import { ModeToggle } from "@/components/ui/mode-toggle"

/** Shell for every signed-in route (dashboard, repos, chat…). */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
            <Logo href="/dashboard" />
            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
