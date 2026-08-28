import { Request, Response } from 'express'
import { fetchBotHealth } from '../services/botHealthClient.js'

export async function getBotHealth(_req: Request, res: Response) {
  const health = await fetchBotHealth()
  res.json(health)
}
