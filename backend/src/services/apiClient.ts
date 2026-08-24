import { config } from '../config.js'

export interface ShipmentData {
  codVendedor: string
  codigoCliente: string
  razonSocial: string
  direccion: string
  localidad: string
  tipoComprobante: string
  nroComprobante: string
  totalCobrar: number
  cantidadBultos: number
  horarioEntrega: string
  zona?: string
}
let cachedCustomers: any[] | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

async function fetchPage(page: number): Promise<{ data: any[]; hasMore: boolean }> {
  const url = `${config.tango.baseUrl}/api/Aperture/Customer?pageSize=5000&pageNumber=${page}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accesstoken': config.tango.accessToken,
    },
  })

  if (!response.ok) {
    throw new Error(`Tango API error (${response.status})`)
  }

  const body = await response.json() as any
  return {
    data: body.Data ?? [],
    hasMore: body.Paging?.MoreData ?? false,
  }
}

async function fetchAllCustomers(): Promise<any[]> {
  try {
    const now = Date.now()
    if (cachedCustomers && now - cacheTime < CACHE_DURATION) {
      console.log('[apiClient] Usando clientes en cache')
      return cachedCustomers
    }

    console.log('[apiClient] Trayendo clientes secuencialmente (pageSize=5000)...')
    const results: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await fetchPage(page)
      results.push(...result.data)
      hasMore = result.hasMore
      console.log(`[apiClient] Página ${page}: ${result.data.length} clientes`)
      page++
    }

    console.log(`[apiClient] Traídos ${results.length} clientes totales`)
    cachedCustomers = results
    cacheTime = now

    return results
  } catch (error) {
    console.error('[apiClient] Error fetching customers from Tango:', error)
    throw error
  }
}

export async function fetchShipmentsByDate(date: string): Promise<ShipmentData[]> {
  try {
    const customers = await fetchAllCustomers()

    // Parsear fecha DD/MM/YYYY
    const [day, month, year] = date.split('/').map(Number)
    const deliveryDate = new Date(year, month - 1, day)
    const dayOfWeek = deliveryDate.getDay()

    // Mapear día de semana a propiedad delivers
    const daysMap = [
      'DeliversSunday',
      'DeliversMonday',
      'DeliversTuesday',
      'DeliversWednesday',
      'DeliversThursday',
      'DeliversFriday',
      'DeliversSaturday'
    ]
    const deliveryProperty = daysMap[dayOfWeek]

    const shipments: ShipmentData[] = []

    customers.forEach((c: any) => {
      const shippingAddresses = c.ShippingAddresses ?? []

      shippingAddresses.forEach((shipping: any) => {
        const deliveryValue = shipping[deliveryProperty]
        if (deliveryValue === 'S') {
          shipments.push({
            codVendedor: c.SellerCode ?? '',
            codigoCliente: c.Code ?? '',
            razonSocial: c.BusinessName ?? c.TradeName ?? '',
            direccion: shipping.Address ?? '',
            localidad: shipping.City ?? '',
            tipoComprobante: 'Factura',
            nroComprobante: c.Code ?? '',
            totalCobrar: 0,
            cantidadBultos: 0,
            horarioEntrega: shipping.DeliveryHours ?? '09:00 - 17:00',
          })
        }
      })
    })

    console.log(`[apiClient] Clientes para ${date}: ${shipments.length} de ${customers.length} total`)
    return shipments
  } catch (error) {
    console.error('[apiClient] Error fetching shipments:', error)
    throw error
  }
}
