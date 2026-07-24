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
}

export function validateConfig(): void {
  const missing: string[] = []

  if (!config.database.url) missing.push('DATABASE_URL')
  if (!config.tango.baseUrl) missing.push('TANGO_API_BASE_URL')
  if (!config.tango.accessToken) missing.push('TANGO_ACCESS_TOKEN')

  if (missing.length > 0) {
    console.warn(
      `[config] Faltan variables: ${missing.join(', ')}. El servidor puede no funcionar correctamente.`,
    )
  }
}
