import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../api'
import {
  ChartCard, Delta, HBars, Legend, Meter, PartBar, Series, StackedColumns, StatTile,
  fmtDay, fmtNum,
} from './MetricasCharts'
import './MetricasView.css'

interface ConvDay {
  fecha: string
  total: number
  abiertas: number
  resueltas: number
  pendientes: number
  pospuestas: number
}

interface ConvMetrics {
  from: string
  to: string
  conversaciones: { total: number; abiertas: number; resueltas: number; pendientes: number; pospuestas: number; sinRespuesta: number }
  origen: { cliente: number; empresa: number; empresaRespondidas: number; tasaRespuesta: number | null }
  mensajes: { entrantes: number; bot: number; asesores: number; plantillas: number }
  tiempoPrimeraRespuestaBotSeg: { promedio: number | null; mediana: number | null }
  porDia?: ConvDay[]
}

interface BotDay {
  fecha: string
  derivacionesBot: number
  derivacionesAsesor: number
  noRegistrados: number
  errores: number
}

interface BotMetrics {
  from: string
  to: string
  conversacionesAtendidasPorBot: number
  derivaciones: {
    conversacionesDerivadas: number
    porBot: number
    porAsesor: number
    tasaDerivacionBot: number | null
    motivos: { motivo: string; cantidad: number }[]
  }
  noRegistrados: { mensajes: number; contactos: number; templatesEnviados: number }
  errores: { total: number; ultimos: { fecha: string; conversationId: number | null; detalle: string | null }[] }
  porDia?: BotDay[]
}

interface MetricsData {
  conv: ConvMetrics
  bot: BotMetrics
  prevConv: ConvMetrics | null
  prevBot: BotMetrics | null
}

// Paleta categórica validada (orden fijo) + pista del medidor en la misma rampa azul.
const BLUE = '#2a78d6'
const ORANGE = '#eb6834'
const AQUA = '#1baf7a'
const BLUE_TRACK = '#cde2fb'

const CONV_SERIES: Series[] = [
  { key: 'resueltas', label: 'Resueltas', color: BLUE },
  { key: 'abiertas', label: 'Abiertas', color: ORANGE },
  { key: 'enEspera', label: 'Pendientes / pospuestas', color: AQUA },
]

const BOT_SERIES: Series[] = [
  { key: 'derivacionesBot', label: 'Derivadas por el bot', color: BLUE },
  { key: 'derivacionesAsesor', label: 'Tomadas por un asesor', color: ORANGE },
]

// ── Fechas (strings YYYY-MM-DD, hora argentina) ────────────────────────────
const DAY_MS = 86400000
const MAX_RANGE_DAYS = 366
const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY_MS)
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS)
const todayART = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)

function daysInRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

type PresetId = 'hoy' | '7d' | '30d' | '90d' | 'mes' | 'mesAnterior' | 'custom'

const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mesAnterior', label: 'Mes anterior' },
]

function presetRange(id: Exclude<PresetId, 'custom'>, today: string): { from: string; to: string } {
  const y = +today.slice(0, 4)
  const m = +today.slice(5, 7)
  switch (id) {
    case 'hoy': return { from: today, to: today }
    case '7d': return { from: addDays(today, -6), to: today }
    case '30d': return { from: addDays(today, -29), to: today }
    case '90d': return { from: addDays(today, -89), to: today }
    case 'mes': return { from: `${today.slice(0, 7)}-01`, to: today }
    case 'mesAnterior': return { from: fromMs(Date.UTC(y, m - 2, 1)), to: fromMs(Date.UTC(y, m - 1, 0)) }
  }
}

function previousRange(from: string, to: string) {
  const len = diffDays(from, to) + 1
  const prevTo = addDays(from, -1)
  return { from: addDays(prevTo, -(len - 1)), to: prevTo }
}

// ── Formatos y variaciones ────────────────────────────────────────────────
const fmtPct = (r: number) => `${(r * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`

function fmtDuration(sec: number): string {
  const s = Math.round(sec)
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
}

type Better = 'up' | 'down' | 'none'

function tone(dir: Delta['dir'], better: Better): Delta['tone'] {
  if (dir === 'flat' || better === 'none') return 'neutral'
  return (dir === 'up') === (better === 'up') ? 'good' : 'bad'
}

function countDelta(cur: number, prev: number | undefined, better: Better): Delta | null {
  if (prev === undefined) return null
  const diff = cur - prev
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const sign = diff > 0 ? '+' : ''
  const text = diff === 0 ? 'sin cambios' : prev === 0 ? `${sign}${fmtNum(diff)}` : `${sign}${fmtPct(diff / prev)}`
  return { text, dir, tone: tone(dir, better) }
}

function rateDelta(cur: number | null, prev: number | null | undefined, better: Better): Delta | null {
  if (cur === null || prev === null || prev === undefined) return null
  const pp = (cur - prev) * 100
  const dir = Math.abs(pp) < 0.05 ? 'flat' : pp > 0 ? 'up' : 'down'
  const text = dir === 'flat' ? 'sin cambios' : `${pp > 0 ? '+' : ''}${pp.toLocaleString('es-AR', { maximumFractionDigits: 1 })} pp`
  return { text, dir, tone: tone(dir, better) }
}

function secondsDelta(cur: number | null, prev: number | null | undefined, better: Better): Delta | null {
  if (cur === null || prev === null || prev === undefined) return null
  const diff = Math.round(cur - prev)
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const text = diff === 0 ? 'sin cambios' : `${diff > 0 ? '+' : '−'}${fmtDuration(Math.abs(diff))}`
  return { text, dir, tone: tone(dir, better) }
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

async function fetchJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`)
  return body as T
}

export default function MetricasView() {
  const today = todayART()
  const [preset, setPreset] = useState<PresetId>('30d')
  const [range, setRange] = useState(() => presetRange('30d', today))
  const [compare, setCompare] = useState(true)
  const [reload, setReload] = useState(0)

  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const reqId = useRef(0)

  const rangeError =
    !range.from || !range.to ? 'Completá las dos fechas'
    : range.from > range.to ? '"Desde" no puede ser posterior a "Hasta"'
    : diffDays(range.from, range.to) >= MAX_RANGE_DAYS ? `El rango máximo es de ${MAX_RANGE_DAYS} días`
    : ''

  const prev = useMemo(() => previousRange(range.from, range.to), [range])

  useEffect(() => {
    if (rangeError) return
    const id = ++reqId.current
    setLoading(true)
    setError('')
    const qs = (from: string, to: string, byDay: boolean) => `from=${from}&to=${to}${byDay ? '&groupBy=day' : ''}`
    Promise.all([
      fetchJson<ConvMetrics>(`/api/metrics/conversations?${qs(range.from, range.to, true)}`),
      fetchJson<BotMetrics>(`/api/metrics/bot?${qs(range.from, range.to, true)}`),
      compare ? fetchJson<ConvMetrics>(`/api/metrics/conversations?${qs(prev.from, prev.to, false)}`) : null,
      compare ? fetchJson<BotMetrics>(`/api/metrics/bot?${qs(prev.from, prev.to, false)}`) : null,
    ])
      .then(([conv, bot, prevConv, prevBot]) => {
        if (id === reqId.current) setData({ conv, bot, prevConv, prevBot })
      })
      .catch((err: Error) => {
        if (id === reqId.current) setError(err.message || 'No se pudieron obtener las métricas')
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
  }, [range, prev, compare, reload, rangeError])

  const selectPreset = (id: Exclude<PresetId, 'custom'>) => {
    setPreset(id)
    setRange(presetRange(id, today))
  }

  const setCustom = (field: 'from' | 'to', value: string) => {
    setPreset('custom')
    setRange((r) => ({ ...r, [field]: value }))
  }

  return (
    <div className="shipments-container metricas">
      <div className="header">
        <div className="header-content">
          <h1 className="title">📊 Métricas</h1>
          <p className="subtitle">Conversaciones de WhatsApp y desempeño del bot</p>
        </div>
      </div>

      <div className="section">
        <div className="mx-filters">
          <div className="mx-presets" role="group" aria-label="Período">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`mx-preset ${preset === p.id ? 'mx-preset-active' : ''}`}
                aria-pressed={preset === p.id}
                onClick={() => selectPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mx-dates">
            <label className="mx-field">Desde
              <input type="date" value={range.from} max={range.to || today} onChange={(e) => setCustom('from', e.target.value)} />
            </label>
            <label className="mx-field">Hasta
              <input type="date" value={range.to} max={today} onChange={(e) => setCustom('to', e.target.value)} />
            </label>
          </div>
          <label className="mx-compare">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Comparar con el período anterior
          </label>
          <button className="mx-refresh" onClick={() => setReload((n) => n + 1)} disabled={loading || Boolean(rangeError)}>
            {loading ? 'Cargando…' : '🔄 Actualizar'}
          </button>
        </div>

        <p className="mx-range-caption">
          {rangeError
            ? <span className="mx-error">{rangeError}</span>
            : <>
                Mostrando del {fmtDay(range.from)}/{range.from.slice(0, 4)} al {fmtDay(range.to)}/{range.to.slice(0, 4)}
                {compare && <> · comparando con {fmtDay(prev.from)}/{prev.from.slice(0, 4)} – {fmtDay(prev.to)}/{prev.to.slice(0, 4)}</>}
              </>}
        </p>

        {error && (
          <p className="mx-error">
            {error} <button className="mx-link" onClick={() => setReload((n) => n + 1)}>Reintentar</button>
          </p>
        )}

        {!data && loading && <p className="mx-empty-inline">Cargando métricas…</p>}

        {data && (
          <div className={`mx-body ${loading ? 'mx-body-loading' : ''}`} aria-busy={loading}>
            <ConversationsSection conv={data.conv} prevConv={data.prevConv} />
            <BotSection bot={data.bot} prevBot={data.prevBot} />
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationsSection({ conv, prevConv }: { conv: ConvMetrics; prevConv: ConvMetrics | null }) {
  const c = conv.conversaciones
  const pc = prevConv?.conversaciones
  const days = useMemo(() => daysInRange(conv.from, conv.to), [conv.from, conv.to])
  const byDay = useMemo(() => new Map((conv.porDia ?? []).map((d) => [d.fecha, d])), [conv.porDia])

  const getValue = (day: string, key: string) => {
    const d = byDay.get(day)
    if (!d) return 0
    if (key === 'enEspera') return d.pendientes + d.pospuestas
    return d[key as 'resueltas' | 'abiertas']
  }

  const o = conv.origen
  const t = conv.tiempoPrimeraRespuestaBotSeg

  return (
    <>
      <h2 className="mx-section-title">Conversaciones</h2>
      <p className="mx-section-note">Conversaciones creadas en el período, con su estado actual en Chatwoot.</p>

      <div className="mx-tiles">
        <StatTile
          label="Conversaciones recibidas"
          value={fmtNum(c.total)}
          note={`${fmtNum(o.cliente)} iniciadas por clientes · ${fmtNum(o.empresa)} por difusión`}
          delta={countDelta(c.total, pc?.total, 'none')}
        />
        <StatTile
          label="Resueltas"
          value={fmtNum(c.resueltas)}
          note={c.total ? `${fmtPct(c.resueltas / c.total)} del total` : undefined}
          delta={countDelta(c.resueltas, pc?.resueltas, 'up')}
        />
        <StatTile
          label="Sin respuesta"
          value={fmtNum(c.sinRespuesta)}
          note="El cliente escribió y nadie le contestó"
          delta={countDelta(c.sinRespuesta, pc?.sinRespuesta, 'down')}
        />
        <StatTile
          label="Respuesta a difusiones"
          value={o.tasaRespuesta === null ? '—' : fmtPct(o.tasaRespuesta)}
          note={`${fmtNum(o.empresaRespondidas)} de ${fmtNum(o.empresa)} difusiones respondidas`}
          delta={rateDelta(o.tasaRespuesta, prevConv?.origen.tasaRespuesta, 'up')}
        />
        <StatTile
          label="Primera respuesta del bot"
          value={t.mediana === null ? '—' : fmtDuration(t.mediana)}
          note={t.promedio === null ? 'Mediana' : `Mediana · promedio ${fmtDuration(t.promedio)}`}
          delta={secondsDelta(t.mediana, prevConv?.tiempoPrimeraRespuestaBotSeg.mediana, 'down')}
        />
      </div>

      <ChartCard
        title="Conversaciones recibidas por día"
        subtitle="Según el estado en que están hoy"
        legend={<Legend series={CONV_SERIES} />}
        table={
          <table className="mx-table">
            <thead>
              <tr>
                <th>Fecha</th><th className="num">Recibidas</th><th className="num">Resueltas</th>
                <th className="num">Abiertas</th><th className="num">Pendientes</th><th className="num">Pospuestas</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const r = byDay.get(d)
                return (
                  <tr key={d}>
                    <td>{fmtDay(d)}</td>
                    <td className="num">{fmtNum(r?.total ?? 0)}</td>
                    <td className="num">{fmtNum(r?.resueltas ?? 0)}</td>
                    <td className="num">{fmtNum(r?.abiertas ?? 0)}</td>
                    <td className="num">{fmtNum(r?.pendientes ?? 0)}</td>
                    <td className="num">{fmtNum(r?.pospuestas ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        }
      >
        <StackedColumns
          days={days}
          series={CONV_SERIES}
          getValue={getValue}
          label="Conversaciones recibidas por día según su estado"
          emptyText="No hubo conversaciones en el período"
        />
      </ChartCard>

      <div className="mx-grid-2">
        <ChartCard title="Origen de las conversaciones" subtitle="Quién escribió primero">
          <PartBar
            parts={[
              { key: 'cliente', label: 'Iniciadas por el cliente', value: o.cliente, color: BLUE },
              { key: 'empresa', label: 'Iniciadas por difusión', value: o.empresa, color: ORANGE },
            ]}
            emptyText="No hubo conversaciones en el período"
          />
          {o.empresa > 0 && (
            <div className="mx-meter-block">
              <div className="mx-meter-head">
                <span>Difusiones respondidas por el cliente</span>
                <strong>{o.tasaRespuesta === null ? '—' : fmtPct(o.tasaRespuesta)}</strong>
              </div>
              <Meter ratio={o.tasaRespuesta ?? 0} color={BLUE} track={BLUE_TRACK} />
              <p className="mx-card-sub">{fmtNum(o.empresaRespondidas)} de {fmtNum(o.empresa)}</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Mensajes del período" subtitle="Sin contar notas privadas">
          <HBars
            color={BLUE}
            emptyText="No hubo mensajes en el período"
            items={[
              { label: 'Enviados por clientes', value: conv.mensajes.entrantes },
              { label: 'Respuestas del bot', value: conv.mensajes.bot },
              { label: 'Respuestas de asesores', value: conv.mensajes.asesores },
              { label: 'Plantillas enviadas (difusiones)', value: conv.mensajes.plantillas },
            ]}
          />
        </ChartCard>
      </div>
    </>
  )
}

function BotSection({ bot, prevBot }: { bot: BotMetrics; prevBot: BotMetrics | null }) {
  const d = bot.derivaciones
  const pd = prevBot?.derivaciones
  const days = useMemo(() => daysInRange(bot.from, bot.to), [bot.from, bot.to])
  const byDay = useMemo(() => new Map((bot.porDia ?? []).map((r) => [r.fecha, r])), [bot.porDia])
  const getValue = (day: string, key: string) => byDay.get(day)?.[key as 'derivacionesBot' | 'derivacionesAsesor'] ?? 0

  return (
    <>
      <h2 className="mx-section-title">Bot</h2>
      <p className="mx-section-note">
        Se registran desde que se activaron las métricas del bot; los días anteriores figuran en cero.
      </p>

      <div className="mx-tiles">
        <StatTile
          label="Atendidas por el bot"
          value={fmtNum(bot.conversacionesAtendidasPorBot)}
          note="Conversaciones con al menos una respuesta del bot"
          delta={countDelta(bot.conversacionesAtendidasPorBot, prevBot?.conversacionesAtendidasPorBot, 'none')}
        />
        <StatTile
          label="Tasa de derivación"
          value={d.tasaDerivacionBot === null ? '—' : fmtPct(d.tasaDerivacionBot)}
          note={`${fmtNum(d.porBot)} derivaciones hechas por el bot`}
          delta={rateDelta(d.tasaDerivacionBot, pd?.tasaDerivacionBot, 'down')}
        />
        <StatTile
          label="Tomadas por un asesor"
          value={fmtNum(d.porAsesor)}
          note="Un asesor escribió antes de que el bot derive"
          delta={countDelta(d.porAsesor, pd?.porAsesor, 'none')}
        />
        <StatTile
          label="Números no registrados"
          value={fmtNum(bot.noRegistrados.contactos)}
          note={`${fmtNum(bot.noRegistrados.mensajes)} mensajes · ${fmtNum(bot.noRegistrados.templatesEnviados)} avisos de alta enviados`}
          delta={countDelta(bot.noRegistrados.contactos, prevBot?.noRegistrados.contactos, 'none')}
        />
        <StatTile
          label="Errores del bot"
          value={fmtNum(bot.errores.total)}
          status={bot.errores.total === 0
            ? <span className="mx-status mx-status-good">✓ Sin errores</span>
            : <span className="mx-status mx-status-critical">⚠ El cliente pudo quedar sin respuesta</span>}
          delta={countDelta(bot.errores.total, prevBot?.errores.total, 'down')}
        />
      </div>

      <ChartCard
        title="Derivaciones a asesor por día"
        legend={<Legend series={BOT_SERIES} />}
        table={
          <table className="mx-table">
            <thead>
              <tr>
                <th>Fecha</th><th className="num">Derivadas por el bot</th><th className="num">Tomadas por asesor</th>
                <th className="num">No registrados</th><th className="num">Errores</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const r = byDay.get(day)
                return (
                  <tr key={day}>
                    <td>{fmtDay(day)}</td>
                    <td className="num">{fmtNum(r?.derivacionesBot ?? 0)}</td>
                    <td className="num">{fmtNum(r?.derivacionesAsesor ?? 0)}</td>
                    <td className="num">{fmtNum(r?.noRegistrados ?? 0)}</td>
                    <td className="num">{fmtNum(r?.errores ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        }
      >
        <StackedColumns
          days={days}
          series={BOT_SERIES}
          getValue={getValue}
          label="Derivaciones a asesor por día"
          emptyText="No hubo derivaciones en el período"
        />
      </ChartCard>

      <div className="mx-grid-2">
        <ChartCard title="Motivos de derivación" subtitle="Los 10 más frecuentes, según el bot">
          <HBars
            color={BLUE}
            emptyText="El bot no derivó conversaciones en el período"
            items={d.motivos.map((m) => ({ label: m.motivo, value: m.cantidad }))}
          />
        </ChartCard>

        <ChartCard title="Últimos errores" subtitle="Hasta 20, del más reciente al más antiguo">
          {bot.errores.ultimos.length === 0
            ? <p className="mx-empty-inline">✓ No hubo errores en el período</p>
            : (
              <div className="mx-table-wrap">
                <table className="mx-table">
                  <thead>
                    <tr><th>Fecha</th><th>Conversación</th><th>Detalle</th></tr>
                  </thead>
                  <tbody>
                    {bot.errores.ultimos.map((e, i) => (
                      <tr key={`${e.fecha}-${i}`}>
                        <td className="mx-nowrap">{fmtDateTime(e.fecha)}</td>
                        <td className="num">{e.conversationId ?? '—'}</td>
                        <td className="mx-detail">{e.detalle ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </ChartCard>
      </div>
    </>
  )
}
