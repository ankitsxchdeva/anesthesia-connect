import { Hono } from 'hono'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

// Guards against non-uuid ids hitting uuid columns (pg would throw → 500).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface QuizRow {
  id: string
  title: string
  description: string | null
  question_count: number
}

// options is jsonb — node-pg already returns it as a parsed JS array.
interface QuestionRow {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string | null
  position: number
}

interface AttemptRow {
  id: string
  quiz_id: string
  score: number
  total: number
  created_at: Date
}

const attemptSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(1),
})

const router = new Hono()

router.get('/', async (c) => {
  const quizzes = await query<QuizRow>(
    `SELECT q.id, q.title, q.description,
            (SELECT count(*) FROM quiz_questions WHERE quiz_id = q.id)::int AS question_count
       FROM quizzes q
      ORDER BY q.title`,
  )
  return c.json(quizzes)
})

// Registered before /:id so "attempts" is not captured as an id.
router.get('/attempts/mine', async (c) => {
  const attempts = await query<AttemptRow>(
    `SELECT id, quiz_id, score, total, created_at
       FROM quiz_attempts
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [getUserId(c)],
  )
  return c.json(attempts)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Quiz not found' }, 404)

  const quiz = await queryOne<QuizRow>(
    `SELECT q.id, q.title, q.description,
            (SELECT count(*) FROM quiz_questions WHERE quiz_id = q.id)::int AS question_count
       FROM quizzes q
      WHERE q.id = $1`,
    [id],
  )
  if (!quiz) return c.json({ error: 'Quiz not found' }, 404)

  const questions = await query<QuestionRow>(
    `SELECT id, prompt, options, correct_index, explanation, position
       FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY position`,
    [id],
  )
  return c.json({ ...quiz, questions })
})

router.post('/:id/attempts', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Quiz not found' }, 404)

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const parsed = attemptSchema.safeParse(raw)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, 400)
  }

  const quiz = await queryOne('SELECT id FROM quizzes WHERE id = $1', [id])
  if (!quiz) return c.json({ error: 'Quiz not found' }, 404)

  const attempt = await queryOne<AttemptRow>(
    `INSERT INTO quiz_attempts (user_id, quiz_id, score, total)
     VALUES ($1, $2, $3, $4)
     RETURNING id, quiz_id, score, total, created_at`,
    [getUserId(c), id, parsed.data.score, parsed.data.total],
  )
  return c.json(attempt, 201)
})

export default router
