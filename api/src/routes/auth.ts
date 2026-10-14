import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
// bcryptjs ships no type declarations and adding @types is disallowed (no new deps).
// @ts-expect-error
import bcrypt from 'bcryptjs'
import { queryOne } from '../db.js'
import { getUserId, signToken } from '../auth.js'

const router = new Hono()

interface UserRow {
  id: string
  email: string
  display_name: string
  role: string
  school: string | null
  grad_year: number | null
  bio: string | null
  created_at: Date
}

// Explicit column list — password_hash must never be selected into a response.
const USER_COLUMNS = 'id, email, display_name, role, school, grad_year, bio, created_at'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(80),
  role: z.enum(['prospective', 'srna', 'crna']),
})

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

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

function isPgError(err: unknown): err is { code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  )
}

function toUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    school: user.school,
    grad_year: user.grad_year,
    bio: user.bio,
    created_at: user.created_at,
  }
}

router.post('/signup', async (c) => {
  const parsed = signupSchema.safeParse(await readJson(c))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)

  const email = parsed.data.email.toLowerCase()
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  let user: UserRow | null = null
  try {
    user = await queryOne<UserRow>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [email, passwordHash, parsed.data.display_name, parsed.data.role],
    )
  } catch (err) {
    if (isPgError(err) && err.code === '23505') {
      return c.json({ error: 'Email already registered' }, 409)
    }
    throw err
  }
  if (!user) return c.json({ error: 'Failed to create user' }, 500)

  const token = await signToken(user.id, user.role)
  return c.json({ token, user: toUser(user) }, 201)
})

router.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await readJson(c))
  if (!parsed.success) return c.json({ error: firstIssue(parsed.error) }, 400)

  const email = parsed.data.email.toLowerCase()
  const row = await queryOne<UserRow & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  )
  if (!row) return c.json({ error: 'Invalid email or password' }, 401)

  const ok = await bcrypt.compare(parsed.data.password, row.password_hash)
  if (!ok) return c.json({ error: 'Invalid email or password' }, 401)

  const token = await signToken(row.id, row.role)
  return c.json({ token, user: toUser(row) })
})

router.get('/me', async (c) => {
  const userId = getUserId(c)
  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  )
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(toUser(user))
})

export default router
