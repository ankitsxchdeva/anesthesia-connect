import { Hono } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

type PostRow = {
  id: string
  category: string
  title: string
  body: string
  is_anonymous: boolean
  author: string
  user_id: string | null
  created_at: Date
  comment_count?: number
}

type CommentRow = {
  id: string
  post_id: string
  parent_id: string | null
  author: string
  body: string
  helpful_count: number
  created_at: Date
  voted?: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const postInput = z.object({
  category: z.enum(['admissions', 'study', 'practice', 'networking']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  is_anonymous: z.boolean().optional().default(false),
})

const commentInput = z.object({
  body: z.string().min(1).max(5000),
  parent_id: z.string().uuid().nullable().optional(),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request body'
}

// Anonymity lives in SQL so the author identity never crosses into results
// for anonymous posts.
const POST_COLUMNS = `
  p.id, p.category, p.title, p.body, p.is_anonymous,
  CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.display_name END AS author,
  CASE WHEN p.is_anonymous THEN NULL ELSE p.user_id END AS user_id,
  p.created_at`

const router = new Hono()

// Static prefix: keep before any /:id routes could shadow it.
router.post('/comments/:id/helpful', async (c) => {
  const commentId = c.req.param('id')
  if (!UUID_RE.test(commentId)) return c.json({ error: 'Not found' }, 404)

  const comment = await queryOne<{ id: string }>(
    'SELECT id FROM comments WHERE id = $1',
    [commentId],
  )
  if (!comment) return c.json({ error: 'Not found' }, 404)

  const inserted = await queryOne<{ comment_id: string }>(
    `INSERT INTO comment_votes (user_id, comment_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING comment_id`,
    [getUserId(c), commentId],
  )
  if (inserted) {
    await query(
      'UPDATE comments SET helpful_count = helpful_count + 1 WHERE id = $1',
      [commentId],
    )
  }

  const row = await queryOne<{ helpful_count: number }>(
    'SELECT helpful_count FROM comments WHERE id = $1',
    [commentId],
  )
  return c.json({ helpful_count: row?.helpful_count ?? 0 })
})

router.get('/', async (c) => {
  const conditions: string[] = []
  const params: unknown[] = []

  const category = c.req.query('category')
  if (category) {
    params.push(category)
    conditions.push(`p.category = $${params.length}`)
  }
  const q = c.req.query('q')
  if (q) {
    params.push(`%${q}%`)
    conditions.push(`(p.title ILIKE $${params.length} OR p.body ILIKE $${params.length})`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const posts = await query<PostRow>(
    `SELECT ${POST_COLUMNS},
       (SELECT count(*) FROM comments cm WHERE cm.post_id = p.id)::int AS comment_count
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.created_at DESC`,
    params,
  )
  return c.json(posts)
})

router.post('/', async (c) => {
  const parsed = postInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const userId = getUserId(c)

  const post = await queryOne<PostRow>(
    `INSERT INTO posts (user_id, category, title, body, is_anonymous)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, category, title, body, is_anonymous, created_at,
       CASE WHEN is_anonymous THEN 'Anonymous'
            ELSE (SELECT display_name FROM users WHERE id = $1) END AS author,
       CASE WHEN is_anonymous THEN NULL ELSE $1 END AS user_id`,
    [userId, parsed.data.category, parsed.data.title, parsed.data.body, parsed.data.is_anonymous],
  )
  if (!post) return c.json({ error: 'Could not create post' }, 500)
  return c.json({ ...post, comment_count: 0 }, 201)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)

  const post = await queryOne<PostRow>(
    `SELECT ${POST_COLUMNS},
       (SELECT count(*) FROM comments cm WHERE cm.post_id = p.id)::int AS comment_count
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [id],
  )
  if (!post) return c.json({ error: 'Not found' }, 404)

  const comments = await query<CommentRow>(
    `SELECT cm.id, cm.post_id, cm.parent_id, u.display_name AS author, cm.body,
            cm.helpful_count, cm.created_at,
            EXISTS (
              SELECT 1 FROM comment_votes cv
              WHERE cv.comment_id = cm.id AND cv.user_id = $2
            ) AS voted
     FROM comments cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.post_id = $1
     ORDER BY cm.created_at ASC`,
    [id, getUserId(c)],
  )
  return c.json({ post, comments })
})

router.post('/:id/comments', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Not found' }, 404)

  const parsed = commentInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)
  const userId = getUserId(c)

  const post = await queryOne<{ id: string }>('SELECT id FROM posts WHERE id = $1', [id])
  if (!post) return c.json({ error: 'Not found' }, 404)

  const parentId = parsed.data.parent_id ?? null
  if (parentId) {
    const parent = await queryOne<{ id: string }>(
      'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
      [parentId, id],
    )
    if (!parent) return c.json({ error: 'Not found' }, 404)
  }

  const comment = await queryOne<CommentRow>(
    `INSERT INTO comments (post_id, user_id, parent_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_id, parent_id, body, helpful_count, created_at,
       (SELECT display_name FROM users WHERE id = $2) AS author`,
    [id, userId, parentId, parsed.data.body],
  )
  if (!comment) return c.json({ error: 'Could not create comment' }, 500)
  return c.json(comment, 201)
})

export default router
