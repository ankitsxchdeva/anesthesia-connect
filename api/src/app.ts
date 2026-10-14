import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from './auth.js'
import auth from './routes/auth.js'
import resources from './routes/resources.js'
import programs from './routes/programs.js'
import applications from './routes/applications.js'
import posts from './routes/posts.js'
import groups from './routes/groups.js'
import events from './routes/events.js'
import decks from './routes/decks.js'
import quizzes from './routes/quizzes.js'
import calculators from './routes/calculators.js'

export const app = new Hono()

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.get('/api/health', (c) => c.json({ ok: true }))

app.use('/api/*', authMiddleware)

app.route('/api/auth', auth)
app.route('/api/resources', resources)
app.route('/api/programs', programs)
app.route('/api/applications', applications)
app.route('/api/posts', posts)
app.route('/api/groups', groups)
app.route('/api/events', events)
app.route('/api/decks', decks)
app.route('/api/quizzes', quizzes)
app.route('/api/calculators', calculators)
