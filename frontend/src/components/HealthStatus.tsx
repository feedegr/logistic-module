import { useEffect, useRef, useState } from 'react'
import './HealthStatus.css'

interface CheckResult {
  ok: boolean
  status?: number
  error?: string
}

interface BotHealth {
  server: CheckResult
  ia: CheckResult
}

const POLL_INTERVAL_MS = 30_000

function dotClass(result: CheckResult | null): string {
  if (!result) return 'health-dot-checking'
  return result.ok ? 'health-dot-ok' : 'health-dot-down'
}

function dotTitle(result: CheckResult | null): string {
  if (!result) return 'Verificando...'
  if (result.ok) return `Status ${result.status ?? 200}`
  return result.error ?? (result.status ? `Status ${result.status}` : 'No responde')
}

export default function HealthStatus() {
  const [health, setHealth] = useState<BotHealth | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = async () => {
    try {
      const res = await fetch('/api/bot-health')
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth({
        server: { ok: false, error: 'No se pudo contactar al backend' },
        ia: { ok: false, error: 'No se pudo contactar al backend' },
      })
    }
  }

  const startPolling = () => {
    if (timerRef.current) return
    check()
    timerRef.current = setInterval(check, POLL_INTERVAL_MS)
  }

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    startPolling()

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <div className="health-status">
      <span className="health-item" title={dotTitle(health?.server ?? null)}>
        <span className={`health-dot ${dotClass(health?.server ?? null)}`} />
        <span className="health-label">Bot</span>
      </span>
      <span className="health-item" title={dotTitle(health?.ia ?? null)}>
        <span className={`health-dot ${dotClass(health?.ia ?? null)}`} />
        <span className="health-label">IA</span>
      </span>
    </div>
  )
}
