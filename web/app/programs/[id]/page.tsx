'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGate } from '@/lib/auth'
import { ApiError, createApplication, getProgram } from '@/lib/api'
import type { Program } from '@/lib/types'
import { formatDate } from '@/lib/format'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui'

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

function ProgramDetail() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [trackState, setTrackState] = useState<'idle' | 'adding' | 'tracked' | 'already'>('idle')
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setError(null)
    getProgram(id)
      .then(setProgram)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load program')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function addToTracker() {
    if (!id) return
    setTrackState('adding')
    try {
      await createApplication({ program_id: id })
      setTrackState('tracked')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setTrackState('already')
      } else {
        setTrackState('idle')
        setAddError(err instanceof Error ? err.message : 'Failed to add to tracker')
      }
    }
  }

  if (notFound) {
    return (
      <>
        <Link href="/programs" className="text-sm text-brand hover:underline">
          ← Back to programs
        </Link>
        <div className="mt-6">
          <EmptyState title="Program not found" hint="It may have been removed, or the link is incorrect." />
        </div>
      </>
    )
  }

  return (
    <>
      <Link href="/programs" className="text-sm text-brand hover:underline">
        ← Back to programs
      </Link>

      {loading && <Spinner />}
      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {program && (
        <>
          <PageHeader
            title={program.name}
            subtitle={[program.city, program.state].filter(Boolean).join(', ') || undefined}
            action={
              <div className="flex flex-col items-end gap-2">
                {trackState === 'tracked' || trackState === 'already' ? (
                  <Button variant="secondary" disabled>
                    {trackState === 'tracked' ? 'In tracker ✓' : 'Already tracked'}
                  </Button>
                ) : (
                  <Button onClick={addToTracker} disabled={trackState === 'adding'}>
                    {trackState === 'adding' ? 'Adding…' : 'Add to tracker'}
                  </Button>
                )}
                {addError && <ErrorBanner message={addError} />}
              </div>
            }
          />

          <Card>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Degree">{program.degree ?? '—'}</Detail>
              <Detail label="Length">
                {program.length_months != null ? `${program.length_months} months` : '—'}
              </Detail>
              <Detail label="Application deadline">{formatDate(program.deadline)}</Detail>
              <Detail label="Tuition">{program.tuition ?? '—'}</Detail>
              <Detail label="Website">
                {program.website ? (
                  <a
                    href={program.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Visit website ↗
                  </a>
                ) : (
                  '—'
                )}
              </Detail>
              <Detail label="Source">
                {program.source_url ? (
                  <a
                    href={program.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Verify via COA
                  </a>
                ) : (
                  '—'
                )}
              </Detail>
              <div className="sm:col-span-2">
                <Detail label="Notes">
                  {program.notes ? <span className="whitespace-pre-wrap">{program.notes}</span> : '—'}
                </Detail>
              </div>
            </dl>
          </Card>

          <p className="mt-4 text-xs text-slate-500">
            Program details are illustrative — always verify deadlines and requirements with the program and
            the COA directory (coacrna.org).
          </p>
        </>
      )}
    </>
  )
}

export default function ProgramDetailPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AuthGate>
        <ProgramDetail />
      </AuthGate>
    </main>
  )
}
