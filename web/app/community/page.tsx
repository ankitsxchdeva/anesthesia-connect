'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listPosts } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import { POST_CATEGORIES, type Post } from '@/lib/types'
import { timeAgo } from '@/lib/format'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Spinner, cn } from '@/components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  admissions: 'Admissions & Applications',
  study: 'SRNA Study & Clinical',
  practice: 'CRNA Practice & Experiences',
  networking: 'Networking & Community',
}

const CATEGORY_COLORS: Record<string, 'blue' | 'violet' | 'green' | 'amber'> = {
  admissions: 'blue',
  study: 'violet',
  practice: 'green',
  networking: 'amber',
}

type Tab = 'all' | (typeof POST_CATEGORIES)[number]

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 300ms debounce for search
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listPosts({ category: tab === 'all' ? undefined : tab, q: q || undefined })
      .then((data) => {
        if (!cancelled) setPosts(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load posts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, q])

  return (
    <AuthGate>
      <PageHeader
        title="Community"
        subtitle="Discussion board for prospective SRNAs, current SRNAs, and CRNAs."
        action={
          <div className="flex items-center gap-4">
            <Link
              href="/community/groups"
              className="text-sm font-medium text-brand hover:underline"
            >
              Browse groups →
            </Link>
            <Link
              href="/community/new"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              New post
            </Link>
          </div>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', ...POST_CATEGORIES] as Tab[]).map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                tab === c ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts here yet"
          hint={q ? 'Try a different search or category.' : 'Be the first to start a discussion.'}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/community/posts/${p.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-900">{p.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {p.author} · {timeAgo(p.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge color={CATEGORY_COLORS[p.category] ?? 'slate'}>
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </Badge>
                    <span className="text-xs text-slate-500">💬 {p.comment_count ?? 0}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AuthGate>
  )
}
