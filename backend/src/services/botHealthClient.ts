const BOT_BASE_URL = process.env.BOT_BASE_URL ?? 'http://bot:3000'

export interface HealthCheckResult {
  ok: boolean
  status?: number
  error?: string
}

async function checkEndpoint(path: string): Promise<HealthCheckResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${BOT_BASE_URL}${path}`, { signal: controller.signal })
    if (response.ok) {
      return { ok: true, status: response.status }
    }
    const body = await response.json().catch(() => null) as { error?: string } | null
    return { ok: false, status: response.status, error: body?.error ?? `HTTP ${response.status}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchBotHealth(): Promise<{ server: HealthCheckResult; ia: HealthCheckResult }> {
  const [server, ia] = await Promise.all([
    checkEndpoint('/health'),
    checkEndpoint('/health/ia'),
  ])
  return { server, ia }
}
