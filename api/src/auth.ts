import type { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'

const secret = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return s
}

export async function signToken(userId: string, role: string): Promise<string> {
  return sign(
    { sub: userId, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    secret(),
    'HS256',
  )
}

// Mounted as app.use('/api/*'). Skips the public auth endpoints.
export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path
  if (path === '/api/auth/login' || path === '/api/auth/signup') return next()

  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return c.json({ error: 'Authentication required' }, 401)

  try {
    const payload = await verify(token, secret(), 'HS256')
    c.set('userId', payload.sub as string)
    c.set('userRole', payload.role as string)
    return next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

export function getUserId(c: Context): string {
  return c.get('userId') as string
}
