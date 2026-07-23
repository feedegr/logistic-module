import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import { fetchShipmentsByDate } from '../services/apiClient.js'

export async function previewShipments(req: Request, res: Response) {
  try {
    const { date } = req.body

    if (!date) {
      res.status(400).json({ error: 'Date is required' })
      return
    }

    let shipments = []
    try {
      shipments = await fetchShipmentsByDate(date)
    } catch (error) {
      console.warn('[previewShipments] No se pudo obtener datos de la API')
      shipments = []
    }

    res.json({ clientCount: shipments.length, date })
  } catch (error) {
    console.error('[previewShipments] Error:', error)
    res.status(500).json({ error: 'Error getting shipment preview' })
  }
}

export async function generateExcel(req: Request, res: Response) {
  try {
    const { date } = req.body

    if (!date) {
      res.status(400).json({ error: 'Date is required' })
      return
    }

    // Traer datos de la API
    let shipments = []
    try {
      shipments = await fetchShipmentsByDate(date)
    } catch (error) {
      console.warn('[excelController] No se pudo obtener datos de la API, usando datos de ejemplo')
      shipments = [
        {
          codVendedor: 'V001',
          codigoCliente: 'C001',
          razonSocial: 'Cliente Ejemplo',
          direccion: 'Calle Principal 123',
          localidad: 'Zona A',
          tipoComprobante: 'Factura',
          nroComprobante: '0001',
          totalCobrar: 1000,
          cantidadBultos: 5,
          horarioEntrega: '09:00 - 12:00'
        }
      ]
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Ventas')

    worksheet.columns = [
      { header: 'COD.VENDEDOR', key: 'codVendedor', width: 15 },
      { header: 'CODIGO CLIENTE', key: 'codigoCliente', width: 18 },
      { header: 'RAZON SOCIAL', key: 'razonSocial', width: 30 },
      { header: 'DIRECCION DE ENTREGA', key: 'direccion', width: 30 },
      { header: 'LOCALIDAD ZONA', key: 'localidad', width: 20 },
      { header: 'TIPO COMPROBANTE', key: 'tipoComprobante', width: 18 },
      { header: 'NRO. COMPROBANTE', key: 'nroComprobante', width: 18 },
      { header: 'TOTAL A COBRAR', key: 'totalCobrar', width: 18 },
      { header: 'CANTIDAD DE BULTOS', key: 'cantidadBultos', width: 18 },
      { header: 'HORARIO_ENTREGA', key: 'horarioEntrega', width: 18 }
    ]

    // Agregar filas con datos de la API
    for (const shipment of shipments) {
      worksheet.addRow(shipment)
    }

    // Estilos del header
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF203d35' }
    }

    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    }

    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="hierbas-${date}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    console.error('[excelController] Error generating excel:', error)
    res.status(500).json({ error: 'Error generating excel' })
  }
}
