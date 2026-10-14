'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthGate, useUser } from '@/lib/auth'
import { listApplications, listDecks, listEvents, listMyAttempts, listRecentResources } from '@/lib/api'
import { formatDate, formatDateTime, timeAgo } from '@/lib/format'
import { ROLE_LABELS, type Application, type ApplicationStatus, type CalendarEvent, type Deck, type EventCategory, type QuizAttempt, type Resource } from '@/lib/types'
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from '@/components/ui'

const STATUS_COLORS: Record<ApplicationStatus, 'teal' | 'slate' | 'amber' | 'red' | 'green' | 'blue' | 'violet'> = {
  researching: 'slate',
  preparing: 'blue',
  submitted: 'violet',
  interview: 'amber',
  accepted: 'green',
  rejected: 'red',
  waitlisted: 'teal',
}

const STATUS_ORDER: ApplicationStatus[] = [
  'researching',
  'preparing',
  'submitted',
  'interview',
  'accepted',
  'waitlisted',
  'rejected',
]

const EVENT_COLORS: Record<EventCategory, 'teal' | 'slate' | 'amber' | 'red' | 'green' | 'blue' | 'violet'> = {
  shift: 'blue',
  class: 'violet',
  clinical: 'teal',
  exam: 'red',
  shadowing: 'green',
  interview: 'amber',
  deadline: 'red',
  study: 'teal',
  other: 'slate',
}

interface DashboardData {
  events: CalendarEvent[]
  applications: Application[]
  recent: Resource[]
  savedDecks: Deck[]
  attempts: QuizAttempt[]
}

function CardHeader({ title, linkHref, linkLabel }: { title: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <Link href={linkHref} className="text-sm font-medium text-brand hover:underline">
        {linkLabel}
      </Link>
    </div>
  )
}

function Dashboard() {
  const { user } = useUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 7)

    Promise.all([
      listEvents({ from: from.toISOString(), to: to.toISOString() }),
      listApplications(),
      listRecentResources(),
      listDecks(),
      listMyAttempts(),
    ])
      .then(([events, applications, recent, decks, attempts]) =>
        setData({
          events,
          applications,
          recent,
          savedDecks: decks.filter((d) => d.saved),
          attempts,
        }),
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load the dashboard.'))
  }, [])

  if (error) return <ErrorBanner message={error} />
  if (!data) return <Spinner />

  const upcoming = data.events.slice(0, 5)

  const statusCounts = new Map<ApplicationStatus, number>()
  for (const a of data.applications) statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1)

  const nearestDeadlines = data.applications
    .filter((a) => a.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3)

  const latestAttempt = data.attempts[0]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back{user ? `, ${user.display_name}` : ''}
        </h1>
        {user && <Badge color="teal">{ROLE_LABELS[user.role]}</Badge>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming events" linkHref="/calendar" linkLabel="Open calendar" />
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing on your schedule" hint="No events in the next 7 days." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((e) => (
                <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">{e.title}</span>
                    <Badge color={EVENT_COLORS[e.category]}>{e.category}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(e.starts_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Application tracker" linkHref="/tracker" linkLabel="Open tracker" />
          {data.applications.length === 0 ? (
            <EmptyState title="No applications yet" hint="Add programs to the tracker to follow your progress." />
          ) : (
            <div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.filter((s) => (statusCounts.get(s) ?? 0) > 0).map((s) => (
                  <Badge key={s} color={STATUS_COLORS[s]}>
                    {s} ×{statusCounts.get(s)}
                  </Badge>
                ))}
              </div>
              {nearestDeadlines.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nearest deadlines</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {nearestDeadlines.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                        <span className="truncate text-sm font-medium text-slate-900">{a.program.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">{formatDate(a.deadline)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recently viewed resources" linkHref="/resources" linkLabel="Browse resources" />
          {data.recent.length === 0 ? (
            <EmptyState title="No recent resources" hint="Resources you open will show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent.slice(0, 5).map((r) => (
                <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm font-medium text-slate-900 hover:text-brand">{r.title}</span>
                    <Badge color="slate">{r.source}</Badge>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Study" linkHref="/study" linkLabel="Open study" />
          {data.savedDecks.length === 0 && !latestAttempt ? (
            <EmptyState title="Nothing saved yet" hint="Save a deck or take a quiz to see progress here." />
          ) : (
            <div>
              {data.savedDecks.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {data.savedDecks.slice(0, 5).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 py-2 first:pt-0">
                      <span className="truncate text-sm font-medium text-slate-900">{d.title}</span>
                      <span className="shrink-0 text-xs text-slate-500">{d.card_count ?? 0} cards</span>
                    </li>
                  ))}
                </ul>
              )}
              {latestAttempt && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last quiz attempt</p>
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <Badge color={latestAttempt.score / latestAttempt.total >= 0.7 ? 'green' : 'amber'}>
                      {latestAttempt.score}/{latestAttempt.total}
                    </Badge>
                    <span className="text-xs text-slate-500">{timeAgo(latestAttempt.created_at)}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  )
}
