import { Hono } from 'hono'
import { query, queryOne } from '../db.js'
import { getUserId } from '../auth.js'

// Guards against non-uuid ids hitting uuid columns (pg would throw → 500).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DeckRow {
  id: string
  title: string
  description: string | null
  author: string
  card_count: number
  saved: boolean
}

interface CardRow {
  id: string
  deck_id: string
  front: string
  back: string
  position: number
}

const router = new Hono()

const deckSelect = `
  SELECT d.id, d.title, d.description, d.author,
         (SELECT count(*) FROM cards WHERE deck_id = d.id)::int AS card_count,
         EXISTS (SELECT 1 FROM deck_saves WHERE deck_id = d.id AND user_id = $1) AS saved
    FROM decks d`

router.get('/', async (c) => {
  const decks = await query<DeckRow>(`${deckSelect} ORDER BY d.title`, [getUserId(c)])
  return c.json(decks)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Deck not found' }, 404)

  const deck = await queryOne<DeckRow>(`${deckSelect} WHERE d.id = $2`, [getUserId(c), id])
  if (!deck) return c.json({ error: 'Deck not found' }, 404)

  const cards = await query<CardRow>(
    'SELECT id, deck_id, front, back, position FROM cards WHERE deck_id = $1 ORDER BY position',
    [id],
  )
  return c.json({ deck, cards })
})

router.post('/:id/save', async (c) => {
  const id = c.req.param('id')
  if (!UUID_RE.test(id)) return c.json({ error: 'Deck not found' }, 404)

  const deck = await queryOne('SELECT id FROM decks WHERE id = $1', [id])
  if (!deck) return c.json({ error: 'Deck not found' }, 404)

  await query(
    'INSERT INTO deck_saves (user_id, deck_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [getUserId(c), id],
  )
  return c.body(null, 204)
})

router.delete('/:id/save', async (c) => {
  const id = c.req.param('id')
  if (UUID_RE.test(id)) {
    await query('DELETE FROM deck_saves WHERE user_id = $1 AND deck_id = $2', [getUserId(c), id])
  }
  return c.body(null, 204)
})

export default router
