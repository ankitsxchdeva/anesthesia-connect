import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

const router = new Hono()

const categorySchema = z.enum([
  'shift',
  'class',
  'clinical',
  'exam',
  'shadowing',
  'interview',
  'deadline',
  'study',
  'other',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Shared field shapes so PATCH is truly partial (no defaults applied on parse).
const eventFields = {
  title: z.string().min(1).max(200),
  category: categorySchema,
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().nullish(),
  all_day: z.boolean(),
  recurrence: z.string().nullish(),
  notes: z.string().nullish(),
}

const createSchema = z.object({
  ...eventFields,
  all_day: z.boolean().default(false),
  group_id: z.string().uuid().nullish(),
})

const patchSchema = z.object(eventFields).partial()

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return undefined // malformed/missing JSON → zod rejects with "Required"
  }
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const row = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId],
  )
  return row !== null
}

router.get('/', async (c) => {
  const userId = getUserId(c)
  const params: unknown[] = [userId]
  let sql = `
    SELECT * FROM events
    WHERE user_id = $1
       OR group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)`
  const from = c.req.query('from')
  const to = c.req.query('to')
  if (from) {
    params.push(from)
    sql += ` AND starts_at >= $${params.length}`
  }
  if (to) {
    params.push(to)
    sql += ` AND starts_at <= $${params.length}`
  }
  sql += ' ORDER BY starts_at ASC'
  const events = await query(sql, params)
  return c.json(events)
})

router.post('/', async (c) => {
  const userId = getUserId(c)
  const parsed = createSchema.safeParse(await readJson(c))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const body = parsed.data

  if (body.group_id && !(await isGroupMember(body.group_id, userId))) {
    return c.json({ error: 'You are not a member of this group' }, 403)
  }

  const event = await queryOne(
    `INSERT INTO events (user_id, group_id, title, category, starts_at, ends_at, all_day, recurrence, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      body.group_id ?? null,
      body.title,
      body.category,
      body.starts_at,
      body.ends_at ?? null,
      body.all_day,
      body.recurrence ?? null,
      body.notes ?? null,
    ],
  )
  return c.json(event, 201)
})

router.patch('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Event not found' }, 404)
  const parsed = patchSchema.safeParse(await readJson(c))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const body = parsed.data

  const existing = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM events WHERE id = $1',
    [id],
  )
  if (!existing) return c.json({ error: 'Event not found' }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: 'Not allowed to modify this event' }, 403)
  }

  const updates: string[] = []
  const params: unknown[] = []
  const set = (column: string, value: unknown) => {
    params.push(value)
    updates.push(`${column} = $${params.length}`)
  }
  if (body.title !== undefined) set('title', body.title)
  if (body.category !== undefined) set('category', body.category)
  if (body.starts_at !== undefined) set('starts_at', body.starts_at)
  if (body.ends_at !== undefined) set('ends_at', body.ends_at)
  if (body.all_day !== undefined) set('all_day', body.all_day)
  if (body.recurrence !== undefined) set('recurrence', body.recurrence)
  if (body.notes !== undefined) set('notes', body.notes)

  if (updates.length === 0) {
    const current = await queryOne('SELECT * FROM events WHERE id = $1', [id])
    return c.json(current)
  }

  const updated = await queryOne(
    `UPDATE events SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`,
    [...params, id],
  )
  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Event not found' }, 404)
  const deleted = await queryOne<{ id: string }>(
    'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId],
  )
  if (deleted) return c.body(null, 204)

  const existing = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM events WHERE id = $1',
    [id],
  )
  if (existing && existing.user_id !== userId) {
    return c.json({ error: 'Not allowed to delete this event' }, 403)
  }
  return c.json({ error: 'Event not found' }, 404)
})

export default router
