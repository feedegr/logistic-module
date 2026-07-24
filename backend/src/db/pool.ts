import pg from 'pg'
import { config } from '../config.js'

const pool = new pg.Pool({ connectionString: config.database.url })

pool.on('error', (err) => {
  console.error('[db] error inesperado en el pool:', err)
})

export default pool
