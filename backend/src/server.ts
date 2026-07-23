import 'dotenv/config.js'
import express from 'express'
import cors from 'cors'
import { config, validateConfig } from './config.js'
import excelRoutes from './routes/excel.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hierbas-del-oasis-backend' })
})

app.use('/excel', excelRoutes)

app.listen(config.port, () => {
  console.log(`[server] escuchando en :${config.port}`)
  validateConfig()
})
