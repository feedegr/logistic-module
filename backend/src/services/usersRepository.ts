import pool from '../db/pool.js'

export interface User {
  id: number
  username: string
  passwordHash: string
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT id, username, password_hash AS "passwordHash" FROM users WHERE username = $1`,
    [username],
  )
  return rows[0] ?? null
}
