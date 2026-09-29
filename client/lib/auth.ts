import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api"

/** Mirrors backend `UserResponse`. */
export type User = {
  id: string
  githubId: number
  githubUsername: string
  displayName: string
  avatarUrl: string | null
}

/** Where to land after a successful sign-in when no return path was saved. */
export const DEFAULT_AUTHED_ROUTE = "/dashboard"

/** Starts the GitHub OAuth flow handled by Spring Security. */
export const GITHUB_LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/github`

/** Returns the signed-in user, or `null` when there is no valid session. */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>("/api/auth/me")
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) return null
    throw err
  }
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" })
}

// ---------------------------------------------------------------------------
// Return-to path: remembered across the OAuth round trip in sessionStorage.
// ---------------------------------------------------------------------------

const RETURN_TO_KEY = "devpilot:returnTo"

/** Only allow same-origin, absolute paths (blocks `//evil.com` open redirects). */
function isSafePath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth/")
}

export function saveReturnTo(path: string) {
  if (!isSafePath(path)) return
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path)
  } catch {
    /* storage unavailable */
  }
}

export function consumeReturnTo(): string {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    if (isSafePath(path)) return path
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_AUTHED_ROUTE
}
