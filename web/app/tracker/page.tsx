'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthGate } from '@/lib/auth'
import { deleteApplication, listApplications, updateApplication } from '@/lib/api'
import type { Application, ApplicationStatus } from '@/lib/types'
import { formatDate } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'

const STATUS_ORDER: ApplicationStatus[] = [
  'researching',
  'preparing',
  'submitted',
  'interview',
  'accepted',
  'waitlisted',
  'rejected',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: 'Researching',
  preparing: 'Preparing',
  submitted: 'Submitted',
  interview: 'Interview',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
}

function ApplicationCard({
  app,
  onUpdated,
  onDeleted,
  onError,
}: {
  app: Application
  onUpdated: (app: Application) => void
  onDeleted: (id: string) => void
  onError: (message: string) => void
}) {
  const [draft, setDraft] = useState(app.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setDraft(app.notes ?? '')
  }, [app.notes])

  async function changeStatus(status: ApplicationStatus) {
    setSaving(true)
    try {
      onUpdated(await updateApplication(app.id, { status }))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  async function saveNotes() {
    setSaving(true)
    try {
      onUpdated(await updateApplication(app.id, { notes: draft }))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove "${app.program.name}" from your tracker?`)) return
    setDeleting(true)
    try {
      await deleteApplication(app.id)
      onDeleted(app.id)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete application')
      setDeleting(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/programs/${app.program_id}`} className="font-medium text-brand hover:underline">
          {app.program.name}
        </Link>
        {app.program.degree && <Badge color="teal">{app.program.degree}</Badge>}
      </div>
      <p className="text-sm text-slate-600">
        Deadline: <span className="text-slate-900">{formatDate(app.deadline ?? app.program.deadline)}</span>
      </p>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
        <Select
          className="mt-1 w-full"
          value={app.status}
          disabled={saving}
          onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</label>
        <Textarea
          className="mt-1"
          rows={3}
          placeholder="Add notes…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={saveNotes} disabled={saving || draft === (app.notes ?? '')}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="danger" onClick={remove} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}

function Tracker() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    listApplications()
      .then(setApps)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load applications'))
      .finally(() => setLoading(false))
  }, [])

  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: apps.filter((a) => a.status === status),
  }))

  return (
    <>
      <PageHeader
        title="Application Tracker"
        subtitle={`${apps.length} ${apps.length === 1 ? 'application' : 'applications'} tracked`}
      />

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}
      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {!loading && !error && apps.length === 0 && (
        <>
          <EmptyState
            title="No programs tracked yet"
            hint="Find programs in the Program Finder."
          />
          <div className="mt-4 text-center">
            <Link href="/programs" className="text-sm font-medium text-brand hover:underline">
              Go to Program Finder →
            </Link>
          </div>
        </>
      )}

      {!loading && !error && apps.length > 0 && (
        <div className="space-y-8">
          {groups.map(({ status, items }) =>
            items.length === 0 ? null : (
              <section key={status}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {STATUS_LABELS[status]}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {items.length}
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onUpdated={(updated) =>
                        setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                      }
                      onDeleted={(id) => setApps((prev) => prev.filter((a) => a.id !== id))}
                      onError={setActionError}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </>
  )
}

export default function TrackerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AuthGate>
        <Tracker />
      </AuthGate>
    </main>
  )
}
