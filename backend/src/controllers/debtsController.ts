import { Request, Response } from 'express'
import { fetchDeudasPorCliente } from '../services/debtsClient.js'

export async function getDeudas(req: Request, res: Response) {
  try {
    const { fromDate, toDate } = req.body

    if (!fromDate || !toDate) {
      res.status(400).json({ error: 'fromDate y toDate son requeridos' })
      return
    }

    const deudas = await fetchDeudasPorCliente(fromDate, toDate)
    res.json({ deudas })
  } catch (error) {
    console.error('[debtsController] Error:', error)
    res.status(500).json({ error: 'Error obteniendo deudas' })
  }
}
