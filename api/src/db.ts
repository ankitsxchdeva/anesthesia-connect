import { Pool } from 'pg'

// POSTGRES_PASSWORD arrives via env_file (.env). PG* vars are set in compose
// for the container; local `npm run dev` loads ../.env via tsx --env-file and
// falls back to localhost:5434 (the compose-published db port).
export const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5434),
  user: process.env.PGUSER ?? 'anesthesia',
  database: process.env.PGDATABASE ?? 'anesthesia',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  max: 10,
})

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
