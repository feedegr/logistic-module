import { config } from '../config.js'

export interface ClienteDeuda {
  codCliente: string | null
  razonSocial: string
  telefono: string
  cantidadComprobantes: number
  deudaTotal: number
}

interface ClienteMaestro {
  COD_CLIENTE: string
  RAZON_SOCIAL: string
}

interface ComprobantePendiente {
  TIPO_COMPROBANTE: string
  NRO_COMPROBANTE: string
  FECHA_DE_VENCIMIENTO: string
  RAZON_SOCIAL: string
  TELEFONO: string
  IMPORTE_PENDIENTE_CTE: number
}

function normalizeRazonSocial(razonSocial: string): string {
  return razonSocial
    .toUpperCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchAllPages<T>(process: string, fromDate: string, toDate: string, pageSize: number): Promise<T[]> {
  const results: T[] = []
  let pageIndex = 0

  while (true) {
    const url = `${config.axoft.baseUrl}?process=${process}&fromDate=${fromDate}&toDate=${toDate}&pageSize=${pageSize}&pageIndex=${pageIndex}&customQuery=0`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ApiAuthorization: config.axoft.apiKey,
        Company: config.axoft.company,
      },
    })

    if (!response.ok) {
      throw new Error(`Axoft API error (${response.status}) en process=${process}`)
    }

    const body = (await response.json()) as { resultData?: { list?: T[] } }
    const list: T[] = body.resultData?.list ?? []
    results.push(...list)

    if (list.length < pageSize) break
    pageIndex++
  }

  return results
}

// El maestro de clientes también filtra por fromDate/toDate (parece ser algo
// como "fecha de alta/actividad"), así que se pide siempre con un rango amplio
// y fijo: es una tabla de lookup (razón social -> código de cliente), no debe
// depender del rango de fechas que el usuario elige para filtrar la deuda.
const MAESTRO_FROM_DATE = '01/01/2000'
const MAESTRO_TO_DATE = '31/12/2030'

async function fetchClientesMaestro(): Promise<ClienteMaestro[]> {
  return fetchAllPages<ClienteMaestro>(config.axoft.processClientes, MAESTRO_FROM_DATE, MAESTRO_TO_DATE, 5000)
}

async function fetchComprobantesPendientes(fromDate: string, toDate: string): Promise<ComprobantePendiente[]> {
  return fetchAllPages<ComprobantePendiente>(config.axoft.processDeudas, fromDate, toDate, 10000)
}

export async function fetchDeudasPorCliente(fromDate: string, toDate: string): Promise<ClienteDeuda[]> {
  const [clientes, comprobantes] = await Promise.all([
    fetchClientesMaestro(),
    fetchComprobantesPendientes(fromDate, toDate),
  ])

  // Un mismo CUIT/razón social puede tener más de un COD_CLIENTE en Tango. La
  // API de comprobantes pendientes no informa el código, así que no hay forma
  // de saber a cuál cuenta pertenece cada comprobante: se listan todos los
  // códigos posibles en vez de elegir uno arbitrariamente.
  const codigosPorRazonSocial = new Map<string, { razonSocial: string; codigos: Set<string> }>()
  for (const cliente of clientes) {
    const key = normalizeRazonSocial(cliente.RAZON_SOCIAL)
    const entry = codigosPorRazonSocial.get(key)
    if (entry) {
      entry.codigos.add(cliente.COD_CLIENTE)
    } else {
      codigosPorRazonSocial.set(key, { razonSocial: cliente.RAZON_SOCIAL, codigos: new Set([cliente.COD_CLIENTE]) })
    }
  }

  const deudaPorRazonSocial = new Map<string, ClienteDeuda>()

  for (const comprobante of comprobantes) {
    const key = normalizeRazonSocial(comprobante.RAZON_SOCIAL)
    const cliente = codigosPorRazonSocial.get(key)

    const existing = deudaPorRazonSocial.get(key)
    if (existing) {
      existing.cantidadComprobantes += 1
      existing.deudaTotal += comprobante.IMPORTE_PENDIENTE_CTE
    } else {
      deudaPorRazonSocial.set(key, {
        codCliente: cliente ? Array.from(cliente.codigos).join(' / ') : null,
        razonSocial: cliente?.razonSocial ?? comprobante.RAZON_SOCIAL,
        telefono: comprobante.TELEFONO ?? '',
        cantidadComprobantes: 1,
        deudaTotal: comprobante.IMPORTE_PENDIENTE_CTE,
      })
    }
  }

  return Array.from(deudaPorRazonSocial.values()).sort((a, b) => b.deudaTotal - a.deudaTotal)
}
