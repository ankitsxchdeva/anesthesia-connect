import { Hono } from 'hono'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

type ResourceRow = {
  id: string
  title: string
  url: string
  source: string
  category: string
  description: string | null
  revision_date: string | null
  created_at: string
  bookmarked: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BOOKMARKED = `EXISTS (
  SELECT 1 FROM bookmarks b WHERE b.user_id = $1 AND b.resource_id = r.id
)`

const COLUMNS = `r.id, r.title, r.url, r.source, r.category,
  r.description, r.revision_date::text AS revision_date, r.created_at`

// Route order matters: /recent and /bookmarks/list must be registered
// before /:id or Hono's param route swallows them.
export default new Hono()
  // GET / — search + filter the directory.
  .get('/', async (c) => {
    const userId = getUserId(c)
    const params: unknown[] = [userId]
    const where: string[] = []

    const q = c.req.query('q')
    if (q) {
      params.push(q)
      const n = params.length
      where.push(
        `(r.title ILIKE '%' || $${n} || '%'` +
          ` OR r.description ILIKE '%' || $${n} || '%'` +
          ` OR r.source ILIKE '%' || $${n} || '%')`,
      )
    }

    const category = c.req.query('category')
    if (category) {
      params.push(category)
      where.push(`r.category = $${params.length}`)
    }

    const source = c.req.query('source')
    if (source) {
      params.push(source)
      where.push(`r.source = $${params.length}`)
    }

    const rows = await query<ResourceRow>(
      `SELECT ${COLUMNS}, ${BOOKMARKED} AS bookmarked
       FROM resources r
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY r.title`,
      params,
    )
    return c.json(rows)
  })

  // GET /recent — caller's 20 most recently viewed.
  .get('/recent', async (c) => {
    const userId = getUserId(c)
    const rows = await query<ResourceRow>(
      `SELECT ${COLUMNS}, ${BOOKMARKED} AS bookmarked
       FROM resource_views rv
       JOIN resources r ON r.id = rv.resource_id
       WHERE rv.user_id = $1
       ORDER BY rv.viewed_at DESC
       LIMIT 20`,
      [userId],
    )
    return c.json(rows)
  })

  // GET /bookmarks/list — caller's bookmarked resources, newest bookmark first.
  .get('/bookmarks/list', async (c) => {
    const userId = getUserId(c)
    const rows = await query<ResourceRow>(
      `SELECT ${COLUMNS}, ${BOOKMARKED} AS bookmarked
       FROM bookmarks bk
       JOIN resources r ON r.id = bk.resource_id
       WHERE bk.user_id = $1
       ORDER BY bk.created_at DESC`,
      [userId],
    )
    return c.json(rows)
  })

  // GET /:id — detail; also records/refreshes the view for /recent.
  .get('/:id', async (c) => {
    const userId = getUserId(c)
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) return c.json({ error: 'Resource not found' }, 404)

    const resource = await queryOne<ResourceRow>(
      `SELECT ${COLUMNS}, ${BOOKMARKED} AS bookmarked
       FROM resources r
       WHERE r.id = $1`,
      [id],
    )
    if (!resource) return c.json({ error: 'Resource not found' }, 404)

    await query(
      `INSERT INTO resource_views (user_id, resource_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = now()`,
      [userId, id],
    )
    return c.json(resource)
  })

  // POST /:id/bookmark — idempotent.
  .post('/:id/bookmark', async (c) => {
    const userId = getUserId(c)
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) return c.json({ error: 'Resource not found' }, 404)

    const exists = await queryOne(`SELECT 1 FROM resources WHERE id = $1`, [id])
    if (!exists) return c.json({ error: 'Resource not found' }, 404)

    await query(
      `INSERT INTO bookmarks (user_id, resource_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, id],
    )
    return c.body(null, 204)
  })

  // DELETE /:id/bookmark — idempotent.
  .delete('/:id/bookmark', async (c) => {
    const userId = getUserId(c)
    const id = c.req.param('id')

    if (UUID_RE.test(id)) {
      await query(`DELETE FROM bookmarks WHERE user_id = $1 AND resource_id = $2`, [userId, id])
    }
    return c.body(null, 204)
  })
