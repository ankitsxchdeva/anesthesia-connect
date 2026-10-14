import { Hono } from 'hono'
import { query, queryOne } from '../db.js'

interface CalculatorRow {
  id: string
  slug: string
  name: string
  description: string | null
  formula: string
  source: string | null
  version: string
  reviewed_by: string | null
  review_date: string | null
}

const router = new Hono()

router.get('/', async (c) => {
  const calculators = await query<CalculatorRow>(
    `SELECT id, slug, name, description, formula, source, version, reviewed_by, review_date
       FROM calculators
      ORDER BY name`,
  )
  return c.json(calculators)
})

// Param is the text slug, not a uuid.
router.get('/:slug', async (c) => {
  const calc = await queryOne<CalculatorRow>(
    `SELECT id, slug, name, description, formula, source, version, reviewed_by, review_date
       FROM calculators
      WHERE slug = $1`,
    [c.req.param('slug')],
  )
  if (!calc) return c.json({ error: 'Calculator not found' }, 404)
  return c.json(calc)
})

export default router
