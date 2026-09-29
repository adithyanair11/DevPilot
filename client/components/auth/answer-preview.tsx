import { FileCodeIcon, SparklesIcon } from "lucide-react"

const citations = [
  { file: "config/SecurityConfig.java", lines: "L27–45" },
  { file: "security/GithubOauth2UserService.java", lines: "L18–52" },
]

/** Decorative sample of a DevPilot answer, shown beside the sign-in form. */
export function AnswerPreview() {
  return (
    <div className="w-full max-w-md space-y-4" aria-hidden="true">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
        How does authentication work in this repo?
      </div>

      <div className="rounded-2xl rounded-bl-sm border bg-card p-4 text-sm shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <SparklesIcon className="size-3.5 text-primary" />
          DevPilot
        </div>
        <p className="leading-relaxed text-card-foreground">
          Users sign in through GitHub OAuth2. Spring Security handles the redirect,
          and a custom user service upserts the user and stores their encrypted
          access token. Sessions are kept in an HTTP-only{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            DEVPILOT_SESSION
          </code>{" "}
          cookie.
        </p>

        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Sources</p>
          {citations.map((c) => (
            <div
              key={c.file}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <FileCodeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.file}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{c.lines}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
