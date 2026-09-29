"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { ApiError } from "@/lib/api"
import { fetchCurrentUser, logout } from "@/lib/auth"

export const authKeys = {
  me: ["auth", "me"] as const,
}

export const currentUserQuery = {
  queryKey: authKeys.me,
  queryFn: fetchCurrentUser,
  staleTime: 5 * 60 * 1000,
  // Retry once on server/network hiccups; 4xx answers are final.
  retry: (failureCount: number, error: Error) =>
    failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
}

/**
 * The signed-in user.
 * `data` is `undefined` while loading, `null` when signed out.
 */
export function useCurrentUser() {
  return useQuery(currentUserQuery)
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Even if the request failed, drop all cached user data locally.
      queryClient.removeQueries()
      queryClient.setQueryData(authKeys.me, null)
      router.replace("/")
    },
  })
}
