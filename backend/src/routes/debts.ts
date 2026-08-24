import { Router } from 'express'
import { getDeudas } from '../controllers/debtsController.js'

const router = Router()

router.post('/', getDeudas)

export default router
