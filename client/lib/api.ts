/**
 * Thin fetch wrapper for the DevPilot Spring Boot API.
 *
 * Auth is a session cookie (DEVPILOT_SESSION) set by the backend after the
 * GitHub OAuth flow, so every request must send credentials.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "")

export class ApiError extends Error {
  /** HTTP status code, or 0 when the server could not be reached. */
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isNetworkError() {
    return this.status === 0
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    })
  } catch {
    throw new ApiError(0, "Can't reach the DevPilot server. Is the backend running?")
  }

  if (!res.ok) {
    // GlobalExceptionHandler returns { status, error, message, timestamp };
    // the 401 entry point returns an empty body.
    let message = res.statusText || `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* empty or non-JSON body */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    return undefined as T
  }
  return (await res.json()) as T
}
