import { cn } from "cn"

/** Colors follow GitHub Linguist so badges look familiar. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Go: "#00add8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Dart: "#00b4ab",
  Scala: "#c22d40",
  HTML: "#e34c26",
  CSS: "#663399",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  "Jupyter Notebook": "#da5b0b",
  Lua: "#000080",
  R: "#198ce7",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Solidity: "#aa6746",
  MDX: "#fcb32c",
}

export function languageColor(language: string) {
  return LANGUAGE_COLORS[language] ?? "var(--muted-foreground)"
}

export function LanguageBadge({
  language,
  className,
}: {
  language: string | null
  className?: string
}) {
  if (!language) {
    return <span className={cn("text-xs text-muted-foreground", className)}>No language detected</span>
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10"
        style={{ backgroundColor: languageColor(language) }}
      />
      <span className="text-foreground/80">{language}</span>
    </span>
  )
}
