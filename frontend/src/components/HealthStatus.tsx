import { useEffect, useRef, useState } from 'react'
import './HealthStatus.css'

type Status = 'checking' | 'ok' | 'degraded' | 'down'

const POLL_INTERVAL_MS = 30_000

const LABELS: Record<Status, string> = {
  checking: 'Verificando...',
  ok: 'Backend y base de datos OK',
  degraded: 'Backend arriba, base de datos no responde',
  down: 'Backend no responde',
}

export default function HealthStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [detail, setDetail] = useState('')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        setStatus('ok')
        setDetail('')
      } else {
        const body = await res.json().catch(() => null)
        setStatus('degraded')
        setDetail(body?.error ?? `HTTP ${res.status}`)
      }
    } catch (err) {
      setStatus('down')
      setDetail(err instanceof Error ? err.message : 'No se pudo contactar al backend')
    } finally {
      setLastChecked(new Date())
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

  const parts = [LABELS[status]]
  if (detail) parts.push(detail)
  if (lastChecked) parts.push(`última verificación ${lastChecked.toLocaleTimeString('es-AR')}`)
  const title = parts.join(' — ')

  return (
    <div className="health-status" title={title}>
      <span className={`health-dot health-dot-${status}`} />
      <span className="health-label">{LABELS[status]}</span>
    </div>
  )
}
