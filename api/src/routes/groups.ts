import { Hono } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

type GroupRow = {
  id: string
  name: string
  description: string | null
  kind: string
  category: string | null
  member_count: number
  is_member: boolean
}

type GroupMemberRow = {
  user_id: string
  display_name: string
  role: string
}

type MessageRow = {
  id: string
  group_id: string
  author: string
  body: string
  pinned: boolean
  created_at: Date
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const groupInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  kind: z.enum(['public', 'private', 'invite']).default('public'),
  category: z.string().max(60).optional(),
})

const messageInput = z.object({
  body: z.string().min(1).max(4000),
})

const pinInput = z.object({
  pinned: z.boolean(),
})

const afterQuery = z.object({
  after: z.string().datetime().optional(),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request body'
}

const router = new Hono()

// Static prefix: keep before the /:id routes could shadow it.
router.post('/messages/:id/pin', async (c) => {
  const messageId = c.req.param('id')
  if (!UUID_RE.test(messageId)) return c.json({ error: 'Not found' }, 404)

  const parsed = pinInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const userId = getUserId(c)

  const row = await queryOne<{ group_id: string; role: string | null }>(
    `SELECT m.group_id, gm.role
     FROM messages m
     LEFT JOIN group_members gm ON gm.group_id = m.group_id AND gm.user_id = $1
     WHERE m.id = $2`,
    [userId, messageId],
  )
  if (!row) return c.json({ error: 'Not found' }, 404)
  if (row.role !== 'admin') return c.json({ error: 'Admins only' }, 403)

  await query('UPDATE messages SET pinned = $1 WHERE id = $2', [
    parsed.data.pinned,
    messageId,
  ])
  return c.body(null, 204)
})

router.get('/', async (c) => {
  const userId = getUserId(c)
  const groups = await query<GroupRow>(
    `SELECT g.id, g.name, g.description, g.kind, g.category,
       (SELECT count(*) FROM group_members mc WHERE mc.group_id = g.id)::int AS member_count,
       EXISTS (
         SELECT 1 FROM group_members me
         WHERE me.group_id = g.id AND me.user_id = $1
       ) AS is_member
     FROM groups g
     WHERE g.kind = 'public'
        OR EXISTS (
          SELECT 1 FROM group_members mm
          WHERE mm.group_id = g.id AND mm.user_id = $1
        )
     ORDER BY g.name`,
    [userId],
  )
  return c.json(groups)
})

router.post('/', async (c) => {
  const parsed = groupInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const userId = getUserId(c)

  const group = await queryOne<{
    id: string
    name: string
    description: string | null
    kind: string
    category: string | null
  }>(
    `INSERT INTO groups (name, description, kind, category, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, kind, category`,
    [
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.kind,
      parsed.data.category ?? null,
      userId,
    ],
  )
  if (!group) return c.json({ error: 'Could not create group' }, 500)

  await query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT DO NOTHING`,
    [group.id, userId],
  )
  return c.json({ ...group, member_count: 1, is_member: true }, 201)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)
  const userId = getUserId(c)

  const group = await queryOne<GroupRow>(
    `SELECT g.id, g.name, g.description, g.kind, g.category,
       (SELECT count(*) FROM group_members mc WHERE mc.group_id = g.id)::int AS member_count,
       EXISTS (
         SELECT 1 FROM group_members me
         WHERE me.group_id = g.id AND me.user_id = $1
       ) AS is_member
     FROM groups g
     WHERE g.id = $2`,
    [userId, id],
  )
  if (!group) return c.json({ error: 'Not found' }, 404)
  if (group.kind !== 'public' && !group.is_member) {
    return c.json({ error: 'Members only' }, 403)
  }

  const members = await query<GroupMemberRow>(
    `SELECT gm.user_id, u.display_name, gm.role
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.created_at ASC, u.display_name ASC`,
    [id],
  )
  return c.json({ group, members })
})

router.post('/:id/join', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)
  const userId = getUserId(c)

  const group = await queryOne<{ kind: string }>('SELECT kind FROM groups WHERE id = $1', [id])
  if (!group) return c.json({ error: 'Not found' }, 404)
  if (group.kind !== 'public') {
    return c.json({ error: 'This group is invite-only' }, 403)
  }

  await query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT DO NOTHING`,
    [id, userId],
  )
  return c.body(null, 204)
})

router.post('/:id/leave', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)

  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [
    id,
    getUserId(c),
  ])
  return c.body(null, 204)
})

router.get('/:id/messages', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)
  const userId = getUserId(c)

  const after = afterQuery.safeParse(c.req.query())
  if (!after.success) return c.json({ error: firstIssue(after.error) }, 400)

  // One round trip: row exists iff the group exists; null role = not a member.
  const membership = await queryOne<{ id: string; role: string | null }>(
    `SELECT g.id, gm.role
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
     WHERE g.id = $1`,
    [id, userId],
  )
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!membership.role) return c.json({ error: 'Members only' }, 403)

  const conditions = ['m.group_id = $1']
  const params: unknown[] = [id]
  if (after.data.after) {
    params.push(after.data.after)
    conditions.push(`m.created_at > $${params.length}`)
  }

  const messages = await query<MessageRow>(
    `SELECT m.id, m.group_id, u.display_name AS author, m.body, m.pinned, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY m.created_at ASC
     LIMIT 100`,
    params,
  )
  return c.json(messages)
})

router.post('/:id/messages', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)

  const parsed = messageInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const userId = getUserId(c)

  const membership = await queryOne<{ id: string; role: string | null }>(
    `SELECT g.id, gm.role
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
     WHERE g.id = $1`,
    [id, userId],
  )
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!membership.role) return c.json({ error: 'Members only' }, 403)

  const message = await queryOne<MessageRow>(
    `INSERT INTO messages (group_id, user_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, group_id, body, pinned, created_at,
       (SELECT display_name FROM users WHERE id = $2) AS author`,
    [id, userId, parsed.data.body],
  )
  if (!message) return c.json({ error: 'Could not send message' }, 500)
  return c.json(message, 201)
})

export default router
