'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getGroup, listMessages, pinMessage, sendMessage } from '@/lib/api'
import { AuthGate, useUser } from '@/lib/auth'
import type { Group, GroupMember, Message } from '@/lib/types'
import { timeAgo } from '@/lib/format'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Spinner } from '@/components/ui'

const KIND_BADGES: Record<Group['kind'], { label: string; color: 'teal' | 'amber' | 'violet' }> = {
  public: { label: 'Public', color: 'teal' },
  private: { label: 'Private', color: 'amber' },
  invite: { label: 'Invite only', color: 'violet' },
}

export default function GroupChatPage() {
  const params = useParams<{ id: string }>()
  const groupId = params.id
  const { user } = useUser()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membersOnly, setMembersOnly] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pinningId, setPinningId] = useState<string | null>(null)

  const lastSeenRef = useRef<string>('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const { group: g, members: m } = await getGroup(groupId)
      const msgs = await listMessages(groupId)
      setGroup(g)
      setMembers(m)
      setMessages(msgs)
      lastSeenRef.current = msgs.length ? msgs[msgs.length - 1].created_at : ''
      setError(null)
      setMembersOnly(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setMembersOnly(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load group')
      }
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    if (groupId) load()
  }, [groupId, load])

  // Poll for new messages every 5s (skip while the tab is hidden).
  useEffect(() => {
    if (!groupId || membersOnly) return
    const timer = setInterval(async () => {
      if (document.hidden) return
      try {
        const newer = await listMessages(groupId, lastSeenRef.current || undefined)
        if (newer.length === 0) return
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const fresh = newer.filter((m) => !seen.has(m.id))
          return fresh.length ? [...prev, ...fresh] : prev
        })
        for (const m of newer) {
          if (!lastSeenRef.current || m.created_at > lastSeenRef.current) {
            lastSeenRef.current = m.created_at
          }
        }
      } catch {
        // transient poll errors are ignored; next tick retries
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [groupId, membersOnly])

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const isAdmin = !!user && members.some((m) => m.user_id === user.id && m.role === 'admin')
  const pinned = messages.filter((m) => m.pinned)

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setActionError(null)
    setSending(true)
    try {
      const msg = await sendMessage(groupId, body)
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (!lastSeenRef.current || msg.created_at > lastSeenRef.current) {
        lastSeenRef.current = msg.created_at
      }
      setDraft('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function onTogglePin(msg: Message) {
    setActionError(null)
    setPinningId(msg.id)
    try {
      await pinMessage(msg.id, !msg.pinned)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update pin')
    } finally {
      setPinningId(null)
    }
  }

  function renderRow(msg: Message) {
    return (
      <div key={msg.id} className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <div>
            <span className="text-sm font-semibold text-slate-900">{msg.author}</span>
            <span className="ml-2 text-xs text-slate-400">{timeAgo(msg.created_at)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{msg.body}</p>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            disabled={pinningId === msg.id}
            onClick={() => onTogglePin(msg)}
            className="shrink-0 text-xs"
          >
            {msg.pinned ? 'Unpin' : '📌 Pin'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <AuthGate>
      {loading ? (
        <Spinner />
      ) : membersOnly ? (
        <div className="space-y-4">
          <Link href="/community/groups" className="text-sm font-medium text-brand hover:underline">
            ← All groups
          </Link>
          <EmptyState title="This group is members-only." hint="Join the group to see its chat." />
        </div>
      ) : error ? (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <Link href="/community/groups" className="text-sm font-medium text-brand hover:underline">
            ← All groups
          </Link>
        </div>
      ) : group ? (
        <div>
          <PageHeader
            title={group.name}
            subtitle={`${group.member_count ?? members.length} ${group.member_count === 1 ? 'member' : 'members'}`}
            action={
              <Link href="/community/groups" className="text-sm font-medium text-brand hover:underline">
                ← All groups
              </Link>
            }
          />
          <div className="mb-4">
            <Badge color={KIND_BADGES[group.kind].color}>{KIND_BADGES[group.kind].label}</Badge>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              {pinned.length > 0 && (
                <Card className="mb-4 bg-brand-soft/40">
                  <h2 className="mb-1 text-sm font-semibold text-slate-900">📌 Pinned</h2>
                  <div className="divide-y divide-slate-100">
                    {pinned.map((m) => (
                      <div key={m.id} className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{m.author}</span>
                          <Badge color="amber">Pinned</Badge>
                          <span className="text-xs text-slate-400">{timeAgo(m.created_at)}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">
                          {m.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {actionError && (
                <div className="mb-4">
                  <ErrorBanner message={actionError} />
                </div>
              )}

              {messages.length === 0 ? (
                <EmptyState title="No messages yet" hint="Say hello to start the conversation." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {messages.map(renderRow)}
                </div>
              )}
              <div ref={bottomRef} />

              <form onSubmit={onSend} className="sticky bottom-4 mt-4 flex items-center gap-2">
                <Input
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit" disabled={!draft.trim() || sending}>
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </div>

            <aside className="w-full shrink-0 lg:w-64">
              <Card>
                <h2 className="mb-2 text-sm font-semibold text-slate-900">
                  Members ({members.length})
                </h2>
                <div>
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="truncate text-sm text-slate-700">{m.display_name}</span>
                      {m.role === 'admin' && <Badge color="teal">admin</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      ) : (
        <EmptyState title="Group not found" />
      )}
    </AuthGate>
  )
}
