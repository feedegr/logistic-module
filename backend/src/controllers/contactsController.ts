import { Request, Response } from 'express'
import { fetchAllContacts } from '../services/contactsRepository.js'

export async function getContacts(_req: Request, res: Response) {
  try {
    const contacts = await fetchAllContacts()
    res.json({ contacts })
  } catch (error) {
    console.error('[contactsController] Error:', error)
    res.status(500).json({ error: 'Error obteniendo clientes' })
  }
}
