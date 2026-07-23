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
}

let cachedCustomers: any[] | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

async function fetchPage(page: number): Promise<{ data: any[]; hasMore: boolean }> {
  const url = `${config.tango.baseUrl}/api/Aperture/Customer?pageSize=500&pageNumber=${page}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accesstoken': config.tango.accessToken,
    },
  })

  if (!response.ok) {
    throw new Error(`Tango API error (${response.status})`)
  }

  const body = await response.json()
  return {
    data: body.Data ?? [],
    hasMore: body.Paging?.MoreData ?? false,
  }
}

async function fetchAllCustomers(): Promise<any[]> {
  try {
    // Verificar cache
    const now = Date.now()
    if (cachedCustomers && now - cacheTime < CACHE_DURATION) {
      console.log('[apiClient] Usando clientes en cache')
      return cachedCustomers
    }

    // Obtener primera página para saber cuántas hay
    const firstPage = await fetchPage(1)
    const results = [...firstPage.data]

    // Si hay más páginas, traerlas en paralelo
    if (firstPage.hasMore) {
      console.log('[apiClient] Trayendo todas las páginas en paralelo...')

      // Estimar cuántas páginas hay aproximadamente
      // Asumimos que cada página tiene 500 registros
      const promises = []
      for (let page = 2; page <= 10; page++) {
        promises.push(
          fetchPage(page)
            .then(result => {
              results.push(...result.data)
              return result.hasMore
            })
            .catch(err => {
              console.warn(`[apiClient] Error en página ${page}:`, err.message)
              return false
            })
        )
      }

      const moreResults = await Promise.all(promises)

      // Si aún hay más datos, continuar
      if (moreResults.some(m => m)) {
        for (let page = 11; page <= 50; page++) {
          try {
            const result = await fetchPage(page)
            results.push(...result.data)
            if (!result.hasMore) break
          } catch (err) {
            console.warn(`[apiClient] Error en página ${page}, deteniendo`)
            break
          }
        }
      }
    }

    console.log(`[apiClient] Traídos ${results.length} clientes`)

    // Cachear resultados
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

    const shipments: ShipmentData[] = customers.map((c: any) => ({
      codVendedor: c.SellerCode ?? '',
      codigoCliente: c.Code ?? '',
      razonSocial: c.BusinessName ?? c.TradeName ?? '',
      direccion: c.ShippingAddresses?.[0]?.Address ?? c.Address ?? '',
      localidad: c.ShippingAddresses?.[0]?.City ?? c.City ?? '',
      tipoComprobante: 'Factura',
      nroComprobante: c.Code ?? '',
      totalCobrar: 0,
      cantidadBultos: 0,
      horarioEntrega: c.ShippingAddresses?.[0]?.DeliveryHours ?? '09:00 - 17:00',
    }))

    return shipments
  } catch (error) {
    console.error('[apiClient] Error fetching shipments:', error)
    throw error
  }
}
