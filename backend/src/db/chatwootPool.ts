import pg from 'pg'
import { config } from '../config.js'

// Conexión de solo lectura a la base de Chatwoot: nunca debe escribir en ella.
const chatwootPool = new pg.Pool({
  connectionString: config.chatwoot.databaseUrl,
  options: '-c default_transaction_read_only=on',
  max: 3,
})

chatwootPool.on('error', (err) => {
  console.error('[chatwoot-db] error inesperado en el pool:', err)
})

export default chatwootPool
