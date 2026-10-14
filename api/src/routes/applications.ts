import { Hono } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

const router = new Hono()

const STATUSES = [
  'researching',
  'preparing',
  'submitted',
  'interview',
  'accepted',
  'rejected',
  'waitlisted',
] as const

const uuid = z.string().uuid()

const createSchema = z.object({
  program_id: uuid,
  status: z.enum(STATUSES).default('researching'),
  deadline: z.string().date().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  deadline: z.string().date().nullable().optional(),
  notes: z.string().nullable().optional(),
})

interface ProgramRow {
  id: string
  name: string
  city: string | null
  state: string | null
  degree: string | null
  length_months: number | null
  deadline: string | null
  tuition: string | null
  website: string | null
  source_url: string | null
  notes: string | null
}

interface ApplicationRow {
  id: string
  program_id: string
  status: string
  deadline: string | null
  notes: string | null
  updated_at: string
  program: ProgramRow
}

// Embedded program object for Application responses (no created_at, per spec).
const PROGRAM_JSON = `json_build_object(
  'id', p.id, 'name', p.name, 'city', p.city, 'state', p.state,
  'degree', p.degree, 'length_months', p.length_months, 'deadline', p.deadline,
  'tuition', p.tuition, 'website', p.website, 'source_url', p.source_url, 'notes', p.notes
) AS program`

const APP_FIELDS = 'a.id, a.program_id, a.status, a.deadline::text AS deadline, a.notes, a.updated_at'

function firstIssue(parsed: { success: false; error: z.ZodError }): string {
  return parsed.error.issues[0]?.message ?? 'Invalid request body'
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

router.get('/', async (c) => {
  const rows = await query<ApplicationRow>(
    `SELECT ${APP_FIELDS}, ${PROGRAM_JSON}
     FROM applications a
     JOIN programs p ON p.id = a.program_id
     WHERE a.user_id = $1
     ORDER BY a.deadline ASC NULLS LAST`,
    [getUserId(c)],
  )
  return c.json(rows)
})

router.post('/', async (c) => {
  const parsed = createSchema.safeParse(await c.req.json().catch(() => undefined))
  if (!parsed.success) return c.json({ error: firstIssue(parsed) }, 400)

  const userId = getUserId(c)
  const { program_id, status, deadline, notes } = parsed.data

  const program = await queryOne('SELECT id FROM programs WHERE id = $1', [program_id])
  if (!program) return c.json({ error: 'Program not found' }, 404)

  try {
    const created = await queryOne<ApplicationRow>(
      `WITH new_app AS (
         INSERT INTO applications (user_id, program_id, status, deadline, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, program_id, status, deadline::text AS deadline, notes, updated_at
       )
       SELECT ${APP_FIELDS}, ${PROGRAM_JSON}
       FROM new_app a
       JOIN programs p ON p.id = a.program_id`,
      [userId, program_id, status, deadline ?? null, notes ?? null],
    )
    if (!created) return c.json({ error: 'Failed to create application' }, 500)
    return c.json(created, 201)
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: 'Program already in your tracker' }, 409)
    throw err
  }
})

router.patch('/:id', async (c) => {
  const id = c.req.param('id')
  if (!uuid.safeParse(id).success) return c.json({ error: 'Application not found' }, 404)

  const parsed = updateSchema.safeParse(await c.req.json().catch(() => undefined))
  if (!parsed.success) return c.json({ error: firstIssue(parsed) }, 400)
  const data = parsed.data

  const sets = ['updated_at = now()']
  const params: unknown[] = [getUserId(c), id]
  if (data.status !== undefined) {
    params.push(data.status)
    sets.push(`status = $${params.length}`)
  }
  if (data.deadline !== undefined) {
    params.push(data.deadline)
    sets.push(`deadline = $${params.length}`)
  }
  if (data.notes !== undefined) {
    params.push(data.notes)
    sets.push(`notes = $${params.length}`)
  }

  const updated = await queryOne<ApplicationRow>(
    `UPDATE applications a SET ${sets.join(', ')}
     FROM programs p
     WHERE a.program_id = p.id AND a.user_id = $1 AND a.id = $2
     RETURNING ${APP_FIELDS}, ${PROGRAM_JSON}`,
    params,
  )
  if (!updated) return c.json({ error: 'Application not found' }, 404)
  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!uuid.safeParse(id).success) return c.json({ error: 'Application not found' }, 404)

  const rows = await query(
    'DELETE FROM applications WHERE user_id = $1 AND id = $2 RETURNING id',
    [getUserId(c), id],
  )
  if (rows.length === 0) return c.json({ error: 'Application not found' }, 404)
  return c.body(null, 204)
})

export default router
