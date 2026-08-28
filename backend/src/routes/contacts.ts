import { Router } from 'express'
import { getContacts } from '../controllers/contactsController.js'

const router = Router()

router.get('/', getContacts)

export default router
