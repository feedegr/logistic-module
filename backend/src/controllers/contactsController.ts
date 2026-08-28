import { Request, Response } from 'express'
import { fetchAllContacts, updateContact, createContact } from '../services/contactsRepository.js'

export async function getContacts(_req: Request, res: Response) {
  try {
    const contacts = await fetchAllContacts()
    res.json({ contacts })
  } catch (error) {
    console.error('[contactsController] Error:', error)
    res.status(500).json({ error: 'Error obteniendo clientes' })
  }
}

export async function putContact(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })
    const updated = await updateContact(id, req.body)
    if (!updated) return res.status(404).json({ error: 'Cliente no encontrado' })
    res.json({ contact: updated })
  } catch (error) {
    console.error('[contactsController] Error actualizando:', error)
    res.status(500).json({ error: 'Error actualizando cliente' })
  }
}

export async function postContact(req: Request, res: Response) {
  try {
    const { tangoId, name, phoneNormalized } = req.body
    if (!tangoId || !name || !phoneNormalized) {
      return res.status(400).json({ error: 'tangoId, name y phoneNormalized son obligatorios' })
    }
    const created = await createContact(req.body)
    res.status(201).json({ contact: created })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese código Tango' })
    }
    console.error('[contactsController] Error creando:', error)
    res.status(500).json({ error: 'Error creando cliente' })
  }
}
