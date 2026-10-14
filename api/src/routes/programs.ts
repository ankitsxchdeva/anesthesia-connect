import { Hono } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'

const router = new Hono()

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
  created_at: string
}

const SELECT_PROGRAMS =
  'SELECT id, name, city, state, degree, length_months, deadline::text AS deadline, tuition, website, source_url, notes, created_at FROM programs'

router.get('/', async (c) => {
  const q = c.req.query('q')?.trim()
  const state = c.req.query('state')?.trim()

  const conditions: string[] = []
  const params: unknown[] = []
  if (q) {
    params.push(`%${q}%`)
    const n = `$${params.length}`
    conditions.push(`(name ILIKE ${n} OR city ILIKE ${n} OR state ILIKE ${n})`)
  }
  if (state) {
    params.push(state)
    conditions.push(`upper(state) = upper($${params.length})`)
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<ProgramRow>(`${SELECT_PROGRAMS}${where} ORDER BY name`, params)
  return c.json(rows)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'Program not found' }, 404)
  }
  const program = await queryOne<ProgramRow>(`${SELECT_PROGRAMS} WHERE id = $1`, [id])
  if (!program) return c.json({ error: 'Program not found' }, 404)
  return c.json(program)
})

export default router
