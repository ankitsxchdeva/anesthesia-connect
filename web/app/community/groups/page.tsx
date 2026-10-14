'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { createGroup, joinGroup, leaveGroup, listGroups } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import type { Group } from '@/lib/types'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Spinner } from '@/components/ui'

const KIND_BADGES: Record<Group['kind'], { label: string; color: 'teal' | 'amber' | 'violet' }> = {
  public: { label: 'Public', color: 'teal' },
  private: { label: 'Private', color: 'amber' },
  invite: { label: 'Invite only', color: 'violet' },
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // create-group form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<Group['kind']>('public')
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listGroups()
      setGroups(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onJoinLeave(g: Group) {
    setActionError(null)
    setBusyId(g.id)
    try {
      if (g.is_member) {
        await leaveGroup(g.id)
      } else {
        await joinGroup(g.id)
      }
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update membership')
    } finally {
      setBusyId(null)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        category: category.trim() || undefined,
      })
      setName('')
      setDescription('')
      setKind('public')
      setCategory('')
      await load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AuthGate>
      <PageHeader
        title="Groups"
        subtitle="Study groups, cohort chats, and interest communities."
        action={
          <Link href="/community" className="text-sm font-medium text-brand hover:underline">
            ← Discussion board
          </Link>
        }
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Create a group</h2>
        <form onSubmit={onCreate} className="space-y-3">
          {createError && <ErrorBanner message={createError} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Category (e.g. Study, Class of 2027)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Select value={kind} onChange={(e) => setKind(e.target.value as Group['kind'])}>
              <option value="public">Public — anyone can join</option>
              <option value="private">Private</option>
              <option value="invite">Invite only</option>
            </Select>
          </div>
          <div>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      </Card>

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : groups.length === 0 ? (
        <EmptyState title="No groups yet" hint="Create the first group above." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => {
            const canOpen = !!g.is_member || g.kind === 'public'
            return (
              <Card key={g.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{g.name}</h3>
                  <Badge color={KIND_BADGES[g.kind].color}>{KIND_BADGES[g.kind].label}</Badge>
                </div>
                {g.category && <p className="mt-0.5 text-xs text-slate-500">{g.category}</p>}
                {g.description && (
                  <p className="mt-2 text-sm text-slate-600">{g.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="text-xs text-slate-500">
                    {g.member_count ?? 0} {g.member_count === 1 ? 'member' : 'members'}
                  </span>
                  <div className="flex items-center gap-2">
                    {canOpen && (
                      <Link
                        href={`/community/groups/${g.id}`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Open
                      </Link>
                    )}
                    <Button
                      variant={g.is_member ? 'secondary' : 'primary'}
                      disabled={busyId === g.id}
                      onClick={() => onJoinLeave(g)}
                    >
                      {g.is_member ? 'Leave' : 'Join'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </AuthGate>
  )
}
