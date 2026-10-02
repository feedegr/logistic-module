import 'dotenv/config.js'
import express from 'express'
import cors from 'cors'
import { config, validateConfig } from './config.js'
import excelRoutes from './routes/excel.js'
import debtsRoutes from './routes/debts.js'
import contactsRoutes from './routes/contacts.js'
import botHealthRoutes from './routes/botHealth.js'
import authRoutes from './routes/auth.js'
import metricsRoutes from './routes/metrics.js'
import { runMigrations } from './db/migrate.js'
import { requireAuth } from './middleware/requireAuth.js'
import pool from './db/pool.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', service: 'hierbas-del-oasis-backend', db: 'up' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[health] DB no responde:', message)
    res.status(503).json({ status: 'degraded', service: 'hierbas-del-oasis-backend', db: 'down', error: message })
  }
})

app.use('/auth', authRoutes)
app.use('/excel', requireAuth, excelRoutes)
app.use('/debts', requireAuth, debtsRoutes)
app.use('/contacts', requireAuth, contactsRoutes)
app.use('/bot-health', requireAuth, botHealthRoutes)
app.use('/metrics', requireAuth, metricsRoutes)

runMigrations()
  .catch((err) => {
    console.error('[startup] no se pudo conectar a Postgres, arrancando igual (ningún endpoint la usa todavía):', err.message)
  })
  .finally(() => {
    app.listen(config.port, () => {
      console.log(`[server] escuchando en :${config.port}`)
      validateConfig()
    })
  })
