'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthGate } from '@/lib/auth'
import { createEvent, deleteEvent, listEvents, updateEvent } from '@/lib/api'
import { EVENT_CATEGORIES, type CalendarEvent, type EventCategory } from '@/lib/types'
import { formatDate, formatDateTime, formatTime } from '@/lib/format'
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
  Textarea,
  cn,
} from '@/components/ui'

const CATEGORY_COLORS: Record<EventCategory, 'slate' | 'blue' | 'teal' | 'red' | 'violet' | 'amber' | 'green'> = {
  shift: 'slate',
  class: 'blue',
  clinical: 'teal',
  exam: 'red',
  shadowing: 'violet',
  interview: 'amber',
  deadline: 'red',
  study: 'green',
  other: 'slate',
}

const DOT_COLORS: Record<EventCategory, string> = {
  shift: 'bg-slate-400',
  class: 'bg-blue-500',
  clinical: 'bg-teal-500',
  exam: 'bg-red-500',
  shadowing: 'bg-violet-500',
  interview: 'bg-amber-500',
  deadline: 'bg-red-500',
  study: 'bg-green-500',
  other: 'bg-slate-400',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface MonthView {
  year: number
  month: number // 0-based
}

interface SelectedDay {
  year: number
  month: number
  day: number
}

interface EventDraft {
  title: string
  category: EventCategory
  starts_at: string // datetime-local value
  ends_at: string // datetime-local value, '' = none
  all_day: boolean
  notes: string
}

const EMPTY_DRAFT: EventDraft = {
  title: '',
  category: 'other',
  starts_at: '',
  ends_at: '',
  all_day: false,
  notes: '',
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// ISO → "yyyy-MM-ddTHH:mm" for <input type="datetime-local"> (local time).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function monthTitle(view: MonthView): string {
  return new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// Hand-rolled month math (no date libs): grid of Date objects, null = leading/trailing blank.
function monthGrid(view: MonthView): Array<Date | null> {
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const leading = new Date(view.year, view.month, 1).getDay()
  const trailing = (7 - ((leading + daysInMonth) % 7)) % 7
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(view.year, view.month, day))
  for (let i = 0; i < trailing; i++) cells.push(null)
  return cells
}

function EventItem({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{event.title}</span>
          <Badge color={CATEGORY_COLORS[event.category]}>{event.category}</Badge>
          {event.group_id && <Badge color="teal">Group event</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDateTime(event.starts_at)}
          {event.ends_at && <> – {formatTime(event.ends_at)}</>}
        </p>
        {event.notes && <p className="mt-1 text-xs text-slate-400">{event.notes}</p>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(event)}>
          Edit
        </Button>
        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => onDelete(event)}>
          Delete
        </Button>
      </div>
    </li>
  )
}

function CalendarPage() {
  const [view, setView] = useState<MonthView>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[] | null>(null)
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthError, setMonthError] = useState<string | null>(null)

  const [upcoming, setUpcoming] = useState<CalendarEvent[] | null>(null)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)

  const [selected, setSelected] = useState<SelectedDay | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Month grid data — refetch on month change.
  useEffect(() => {
    let ignore = false
    const first = new Date(view.year, view.month, 1)
    const last = new Date(view.year, view.month + 1, 0, 23, 59, 59, 999)
    setMonthLoading(true)
    setMonthError(null)
    listEvents({ from: first.toISOString(), to: last.toISOString() })
      .then((events) => {
        if (!ignore) setMonthEvents(events)
      })
      .catch((err: Error) => {
        if (!ignore) setMonthError(err.message)
      })
      .finally(() => {
        if (!ignore) setMonthLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [view])

  // Upcoming: next 10 events from now onward.
  const loadUpcoming = useCallback(() => {
    setUpcomingError(null)
    return listEvents({ from: new Date().toISOString() })
      .then((events) => setUpcoming(events.slice(0, 10)))
      .catch((err: Error) => setUpcomingError(err.message))
  }, [])

  useEffect(() => {
    loadUpcoming()
  }, [loadUpcoming])

  function refresh() {
    const first = new Date(view.year, view.month, 1)
    const last = new Date(view.year, view.month + 1, 0, 23, 59, 59, 999)
    listEvents({ from: first.toISOString(), to: last.toISOString() })
      .then((events) => setMonthEvents(events))
      .catch((err: Error) => setMonthError(err.message))
    loadUpcoming()
  }

  function shiftMonth(delta: number) {
    setMonthEvents(null)
    setSelected(null)
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function openCreate() {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event)
    setDraft({
      title: event.title,
      category: event.category,
      starts_at: isoToLocalInput(event.starts_at),
      ends_at: isoToLocalInput(event.ends_at),
      all_day: event.all_day,
      notes: event.notes ?? '',
    })
    setFormError(null)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function submitForm() {
    if (!draft.title.trim() || !draft.starts_at) {
      setFormError('Title and start time are required.')
      return
    }
    setSaving(true)
    setFormError(null)
    const body = {
      title: draft.title.trim(),
      category: draft.category,
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      all_day: draft.all_day,
      notes: draft.notes.trim() || null,
    }
    try {
      if (editing) {
        await updateEvent(editing.id, body)
      } else {
        await createEvent(body)
      }
      closeForm()
      refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`Delete "${event.title}"?`)) return
    setActionError(null)
    try {
      await deleteEvent(event.id)
      refresh()
    } catch (err) {
      // Group events are owner-only to mutate; surface 403 (and anything else) here.
      setActionError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const eventsByDay = new Map<string, CalendarEvent[]>()
  for (const event of monthEvents ?? []) {
    const key = dayKey(new Date(event.starts_at))
    const list = eventsByDay.get(key)
    if (list) list.push(event)
    else eventsByDay.set(key, [event])
  }

  const today = new Date()
  const isToday = (d: Date) => dayKey(d) === dayKey(today)
  const isSelected = (d: Date) => selected !== null && dayKey(d) === `${selected.year}-${selected.month}-${selected.day}`
  const selectedEvents =
    selected === null
      ? []
      : (eventsByDay.get(`${selected.year}-${selected.month}-${selected.day}`) ?? [])
  const selectedDate =
    selected === null ? null : new Date(selected.year, selected.month, selected.day)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Calendar"
        subtitle="Your shifts, classes, exams, and deadlines in one place."
        action={<Button onClick={openCreate}>New event</Button>}
      />

      {formOpen && (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            {editing ? 'Edit event' : 'New event'}
          </h2>
          {formError && (
            <div className="mb-4">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Cardiothoracic rotation"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
              <Select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as EventCategory })}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand"
                  checked={draft.all_day}
                  onChange={(e) => setDraft({ ...draft, all_day: e.target.checked })}
                />
                All day
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Starts</label>
              <Input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ends (optional)</label>
              <Input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Anything to remember…"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={submitForm} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Month grid */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <Button variant="secondary" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                ←
              </Button>
              <h2 className="text-base font-semibold text-slate-900">{monthTitle(view)}</h2>
              <Button variant="secondary" aria-label="Next month" onClick={() => shiftMonth(1)}>
                →
              </Button>
            </div>

            {monthError && (
              <div className="mb-4">
                <ErrorBanner message={monthError} />
              </div>
            )}

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {monthLoading && monthEvents === null ? (
              <Spinner />
            ) : (
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthGrid(view).map((date, i) => {
                  if (!date) return <div key={`blank-${i}`} aria-hidden />
                  const dayEvents = eventsByDay.get(dayKey(date)) ?? []
                  const shown = dayEvents.slice(0, 2)
                  const extra = dayEvents.length - shown.length
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() =>
                        setSelected({ year: date.getFullYear(), month: date.getMonth(), day: date.getDate() })
                      }
                      className={cn(
                        'min-h-[72px] rounded-lg border p-1.5 text-left align-top transition-colors hover:bg-slate-50',
                        isSelected(date)
                          ? 'border-brand ring-2 ring-brand'
                          : 'border-slate-200',
                        isToday(date) && !isSelected(date) && 'bg-brand-soft border-brand',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isToday(date) ? 'text-brand' : 'text-slate-700',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {shown.map((event) => (
                          <div key={event.id} className="flex items-center gap-1">
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_COLORS[event.category])} />
                            <span className="truncate text-[10px] leading-tight text-slate-600">{event.title}</span>
                          </div>
                        ))}
                        {extra > 0 && <div className="text-[10px] text-slate-400">+{extra} more</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedDate && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                  Events on {formatDate(selectedDate.toISOString())}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="py-3 text-sm text-slate-400">No events this day.</p>
                ) : (
                  <ul>
                    {selectedEvents.map((event) => (
                      <EventItem key={event.id} event={event} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming */}
        <div>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Upcoming</h2>
            {upcomingError && (
              <div className="mb-4">
                <ErrorBanner message={upcomingError} />
              </div>
            )}
            {upcoming === null ? (
              <Spinner />
            ) : upcoming.length === 0 ? (
              <EmptyState title="Nothing scheduled" hint="Create an event to see it here." />
            ) : (
              <ul>
                {upcoming.map((event) => (
                  <EventItem key={event.id} event={event} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPageWithAuth() {
  return (
    <AuthGate>
      <CalendarPage />
    </AuthGate>
  )
}
