import { Router } from 'express'
import { getContacts, putContact, postContact } from '../controllers/contactsController.js'

const router = Router()

router.get('/', getContacts)
router.put('/:id', putContact)
router.post('/', postContact)

export default router
