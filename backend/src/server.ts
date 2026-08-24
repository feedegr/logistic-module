import 'dotenv/config.js'
import express from 'express'
import cors from 'cors'
import { config, validateConfig } from './config.js'
import excelRoutes from './routes/excel.js'
import debtsRoutes from './routes/debts.js'
import { runMigrations } from './db/migrate.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hierbas-del-oasis-backend' })
})

app.use('/excel', excelRoutes)
app.use('/debts', debtsRoutes)

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
