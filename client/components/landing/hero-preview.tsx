import {
  ChevronDownIcon,
  FileCodeIcon,
  GitBranchIcon,
  SendHorizontalIcon,
  SparklesIcon,
} from "lucide-react"

const snippet = [
  { n: 31, code: "http.cors(Customizer.withDefaults()).csrf(csrf -> csrf.disable())" },
  { n: 32, code: "    .sessionManagement(session -> session" },
  { n: 33, code: "        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))" },
  { n: 34, code: "    .oauth2Login(oauth -> oauth" },
  { n: 35, code: "        .userInfoEndpoint(u -> u.userService(gitHubOAuth2UserService))" },
]

const sources = [
  { file: "config/SecurityConfig.java", lines: "L27–56" },
  { file: "security/GithubOauth2UserService.java", lines: "L18–52" },
  { file: "application.properties", lines: "L20–24" },
]

/** Static mock of the chat UI used in the landing hero. Purely decorative. */
export function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-foreground/5"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2.5 py-1 font-mono text-xs">
          <span className="truncate">you/devpilot-backend</span>
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
        </div>
        <div className="hidden items-center gap-1 font-mono text-xs text-muted-foreground sm:flex">
          <GitBranchIcon className="size-3" />
          main
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:flex">
          <span className="size-1.5 rounded-full bg-primary" />
          Indexed
        </span>
      </div>

      {/* Conversation */}
      <div className="space-y-4 p-4 text-sm sm:p-5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          Where is the GitHub login configured, and how is the session kept?
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            DevPilot
          </div>
          <p className="leading-relaxed">
            GitHub OAuth2 is set up in <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SecurityConfig</code>.
            A custom user service saves the user after login, and the session is kept in an
            HTTP-only <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">DEVPILOT_SESSION</code> cookie
            that lasts 7 days.
          </p>

          <div className="overflow-hidden rounded-lg border bg-muted/40 font-mono text-[11px] leading-5 sm:text-xs">
            <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-muted-foreground">
              <FileCodeIcon className="size-3.5" />
              config/SecurityConfig.java
            </div>
            <div className="overflow-x-auto py-2">
              {snippet.map((line) => (
                <div key={line.n} className="flex gap-3 px-3 whitespace-pre">
                  <span className="w-5 shrink-0 text-right text-muted-foreground/70 select-none">
                    {line.n}
                  </span>
                  <span>{line.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <span
                key={s.file}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-mono text-[11px]"
              >
                <span className="flex size-4 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                {s.file}
                <span className="text-muted-foreground">{s.lines}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
          Ask about this repository…
          <span className="ml-auto flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <SendHorizontalIcon className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  )
}
