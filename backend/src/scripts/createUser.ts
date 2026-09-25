import 'dotenv/config.js'
import bcrypt from 'bcrypt'
import pool from '../db/pool.js'

async function main() {
  const [username, password] = process.argv.slice(2)

  if (!username || !password) {
    console.error('Uso: npm run create-user -- <usuario> <contraseña>')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [username, passwordHash],
  )

  console.log(`Usuario "${username}" creado/actualizado correctamente.`)
  await pool.end()
}

main().catch((err) => {
  console.error('Error creando usuario:', err)
  process.exit(1)
})
