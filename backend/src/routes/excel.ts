import { Router } from 'express'
import { generateExcel, previewShipments } from '../controllers/excelController.js'

const router = Router()

router.post('/preview', previewShipments)
router.post('/generate', generateExcel)

export default router
