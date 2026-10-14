'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AuthGate } from '@/lib/auth'
import { ApiError, createApplication, listPrograms } from '@/lib/api'
import type { Program } from '@/lib/types'
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

type TrackResult = 'ok' | 'dup'

function Location({ program }: { program: Program }) {
  const place = [program.city, program.state].filter(Boolean).join(', ')
  return <span>{place || '—'}</span>
}

function AddToTrackerButton({
  program,
  tracked,
  onTracked,
  onError,
}: {
  program: Program
  tracked?: TrackResult
  onTracked: (id: string, result: TrackResult) => void
  onError: (message: string) => void
}) {
  const [adding, setAdding] = useState(false)

  async function add() {
    setAdding(true)
    try {
      await createApplication({ program_id: program.id })
      onTracked(program.id, 'ok')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onTracked(program.id, 'dup')
      } else {
        onError(err instanceof Error ? err.message : 'Failed to add to tracker')
      }
    } finally {
      setAdding(false)
    }
  }

  if (tracked) {
    return (
      <Button variant="secondary" disabled>
        {tracked === 'ok' ? 'In tracker ✓' : 'Already tracked'}
      </Button>
    )
  }
  return (
    <Button variant="secondary" onClick={add} disabled={adding}>
      {adding ? 'Adding…' : 'Add to tracker'}
    </Button>
  )
}

function ProgramFinder() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [tracked, setTracked] = useState<Record<string, TrackResult>>({})

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  useEffect(() => {
    listPrograms()
      .then(setPrograms)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load programs'))
      .finally(() => setLoading(false))
  }, [])

  // 300ms debounce on the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const states = useMemo(
    () => Array.from(new Set(programs.map((p) => p.state).filter((s): s is string => Boolean(s)))).sort(),
    [programs],
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return programs.filter((p) => {
      if (stateFilter && p.state !== stateFilter) return false
      if (!needle) return true
      const haystack = `${p.name} ${p.city ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [programs, debouncedQ, stateFilter])

  return (
    <>
      <PageHeader
        title="Program Finder"
        subtitle="Browse nurse anesthesia programs and track the ones you're applying to."
      />
      <p className="-mt-4 mb-6 text-xs text-slate-500">
        Program details are illustrative — always verify deadlines and requirements with the program and
        the COA directory (coacrna.org).
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            type="search"
            placeholder="Search by name or city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && (
        <>
          {addError && (
            <div className="mb-4">
              <ErrorBanner message={addError} />
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState title="No programs match your search." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((p) => (
                <Card key={p.id} className="flex flex-col gap-3">
                  <div>
                    <Link
                      href={`/programs/${p.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-500">
                      <Location program={p} />
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.degree && <Badge color="teal">{p.degree}</Badge>}
                    <span className="text-sm text-slate-600">
                      {p.length_months != null ? `${p.length_months} months` : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Deadline: <span className="text-slate-900">{formatDate(p.deadline)}</span>
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <AddToTrackerButton
                      program={p}
                      tracked={tracked[p.id]}
                      onTracked={(id, result) => setTracked((prev) => ({ ...prev, [id]: result }))}
                      onError={setAddError}
                    />
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Visit website ↗
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function ProgramsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AuthGate>
        <ProgramFinder />
      </AuthGate>
    </main>
  )
}
