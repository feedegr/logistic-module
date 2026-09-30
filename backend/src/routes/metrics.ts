import { Router } from 'express'
import { getConversations, getBot } from '../controllers/metricsController.js'

const router = Router()

router.get('/conversations', getConversations)
router.get('/bot', getBot)

export default router
