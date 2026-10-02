import { Request, Response } from 'express'
import { getConversationMetrics, getBotMetrics, DateRange } from '../services/metricsRepository.js'

const DAY_MS = 24 * 60 * 60 * 1000
const ART_OFFSET_MS = -3 * 60 * 60 * 1000
const MAX_RANGE_DAYS = 366

function todayART(): string {
  return new Date(Date.now() + ART_OFFSET_MS).toISOString().slice(0, 10)
}

// Medianoche ART del día dado, en UTC. Devuelve null si la fecha no es válida (ej: 2026-02-30).
function artMidnightUtc(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const d = new Date(`${date}T00:00:00-03:00`)
  if (isNaN(d.getTime())) return null
  if (new Date(d.getTime() + ART_OFFSET_MS).toISOString().slice(0, 10) !== date) return null
  return d
}

type ParsedQuery = { from: string; to: string; range: DateRange; byDay: boolean } | { error: string }

function parseQuery(req: Request): ParsedQuery {
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : todayART()
  const toStart = artMidnightUtc(to)
  if (!toStart) return { error: 'Parámetro "to" inválido (formato YYYY-MM-DD)' }

  const from = typeof req.query.from === 'string' && req.query.from
    ? req.query.from
    : new Date(toStart.getTime() - 6 * DAY_MS + ART_OFFSET_MS).toISOString().slice(0, 10)
  const fromStart = artMidnightUtc(from)
  if (!fromStart) return { error: 'Parámetro "from" inválido (formato YYYY-MM-DD)' }

  if (fromStart > toStart) return { error: '"from" no puede ser posterior a "to"' }
  if ((toStart.getTime() - fromStart.getTime()) / DAY_MS >= MAX_RANGE_DAYS) {
    return { error: `El rango no puede superar ${MAX_RANGE_DAYS} días` }
  }

  return {
    from,
    to,
    range: {
      fromUtc: fromStart.toISOString(),
      toUtc: new Date(toStart.getTime() + DAY_MS).toISOString(),
    },
    byDay: req.query.groupBy === 'day',
  }
}

export async function getConversations(req: Request, res: Response) {
  const q = parseQuery(req)
  if ('error' in q) return res.status(400).json({ error: q.error })
  try {
    const metrics = await getConversationMetrics(q.range, q.byDay)
    res.json({ from: q.from, to: q.to, ...metrics })
  } catch (error) {
    console.error('[metricsController] Error en conversaciones:', error)
    res.status(500).json({ error: 'Error obteniendo métricas de conversaciones' })
  }
}

export async function getBot(req: Request, res: Response) {
  const q = parseQuery(req)
  if ('error' in q) return res.status(400).json({ error: q.error })
  try {
    const metrics = await getBotMetrics(q.range, q.byDay)
    res.json({ from: q.from, to: q.to, ...metrics })
  } catch (error) {
    console.error('[metricsController] Error en métricas del bot:', error)
    res.status(500).json({ error: 'Error obteniendo métricas del bot' })
  }
}
