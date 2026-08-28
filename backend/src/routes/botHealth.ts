import { Router } from 'express'
import { getBotHealth } from '../controllers/botHealthController.js'

const router = Router()

router.get('/', getBotHealth)

export default router
