export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:password@localhost:5432/oasisbot',
  },
  tango: {
    baseUrl: process.env.TANGO_API_BASE_URL ?? 'https://tiendas.axoft.com',
    accessToken: process.env.TANGO_ACCESS_TOKEN ?? '',
    pageSize: Number(process.env.TANGO_PAGE_SIZE ?? 5000),
  },
  axoft: {
    baseUrl: process.env.AXOFT_API_BASE_URL ?? 'https://058430-001.connect.axoft.com/Api/GetApiLiveQueryData',
    apiKey: process.env.AXOFT_API_KEY ?? '',
    company: process.env.AXOFT_COMPANY ?? '136',
    processClientes: process.env.AXOFT_PROCESS_CLIENTES ?? '17961',
    processDeudas: process.env.AXOFT_PROCESS_DEUDAS ?? '17952',
  },
}

export function validateConfig(): void {
  const missing: string[] = []

  if (!config.database.url) missing.push('DATABASE_URL')
  if (!config.tango.baseUrl) missing.push('TANGO_API_BASE_URL')
  if (!config.tango.accessToken) missing.push('TANGO_ACCESS_TOKEN')
  if (!config.axoft.apiKey) missing.push('AXOFT_API_KEY')

  if (missing.length > 0) {
    console.warn(
      `[config] Faltan variables: ${missing.join(', ')}. El servidor puede no funcionar correctamente.`,
    )
  }
}
