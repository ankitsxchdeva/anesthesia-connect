'use client'

import { useEffect, useState } from 'react'
import {
  bookmarkResource,
  getResource,
  listRecentResources,
  listResources,
  unbookmarkResource,
} from '@/lib/api'
import type { Resource } from '@/lib/types'
import { AuthGate } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'

function ExternalIcon() {
  return (
    <svg
      className="ml-1 inline-block h-3.5 w-3.5 shrink-0 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function ResourcesContent() {
  const [recent, setRecent] = useState<Resource[]>([])
  const [results, setResults] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])

  // Recently viewed strip (hidden if empty).
  useEffect(() => {
    let cancelled = false
    listRecentResources()
      .then((rows) => {
        if (!cancelled) setRecent(rows)
      })
      .catch(() => {
        // Strip stays hidden; the main list surfaces real API failures.
        if (!cancelled) setRecent([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Option sets come from one unfiltered fetch.
  useEffect(() => {
    let cancelled = false
    listResources()
      .then((rows) => {
        if (cancelled) return
        setCategories([...new Set(rows.map((r) => r.category))].sort())
        setSources([...new Set(rows.map((r) => r.source))].sort())
      })
      .catch(() => {
        // Filters simply stay empty; the results fetch reports the error.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 300ms debounce on the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  // Results: refetch whenever any filter changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listResources({
      q: debouncedQ || undefined,
      category: category || undefined,
      source: source || undefined,
    })
      .then((rows) => {
        if (cancelled) return
        setResults(rows)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load resources')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQ, category, source])

  function toggleBookmark(r: Resource) {
    const next = !r.bookmarked
    // Optimistic update, revert on failure.
    setResults((rows) => rows.map((x) => (x.id === r.id ? { ...x, bookmarked: next } : x)))
    const call = next ? bookmarkResource(r.id) : unbookmarkResource(r.id)
    call.catch(() => {
      setResults((rows) => rows.map((x) => (x.id === r.id ? { ...x, bookmarked: !next } : x)))
      setError('Could not update bookmark — please try again.')
    })
  }

  // Record the view without blocking the outbound navigation.
  function recordView(id: string) {
    getResource(id).catch(() => {})
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Curated study guides, references, and clinical resources."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {recent.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recently viewed
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
              >
                <p className="line-clamp-2 text-sm font-medium text-slate-900">{r.title}</p>
                <p className="mt-1.5 text-xs text-slate-500">{r.source}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[16rem] flex-1">
          <Input
            type="search"
            placeholder="Search resources…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search resources"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : results.length === 0 ? (
        <EmptyState title="No resources found" hint="Try a different search or filter." />
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordView(r.id)}
                  className="font-medium text-brand hover:underline"
                >
                  {r.title}
                  <ExternalIcon />
                </a>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge color="teal">{r.source}</Badge>
                  <Badge color="slate">{r.category}</Badge>
                  {r.revision_date && (
                    <span className="text-xs text-slate-400">Revised {formatDate(r.revision_date)}</span>
                  )}
                </div>
                {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
              </div>
              <Button
                variant={r.bookmarked ? 'ghost' : 'secondary'}
                className="shrink-0"
                aria-pressed={Boolean(r.bookmarked)}
                onClick={() => toggleBookmark(r)}
              >
                {r.bookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResourcesPage() {
  return (
    <AuthGate>
      <ResourcesContent />
    </AuthGate>
  )
}
