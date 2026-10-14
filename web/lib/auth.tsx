'use client'

// Auth helpers for client components. Contract file — do not edit.

import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { clearToken, getToken, me } from './api'
import type { User } from './types'

export { clearToken, getToken, setToken } from './api'

let cachedUser: User | null = null

export function logout() {
  clearToken()
  cachedUser = null
  window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/login`
}

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)

  useEffect(() => {
    if (cachedUser) return
    if (!getToken()) {
      setLoading(false)
      return
    }
    me()
      .then((u) => {
        cachedUser = u
        setUser(u)
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}

// Wraps every authenticated page: redirects to /login when there is no token.
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }
  return <>{children}</>
}
