import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react'

export interface Series {
  key: string
  label: string
  color: string
}

const GRID = '#e1e0d9'
const AXIS = '#c3c2b7'
const HOVER_WASH = '#f3f2ee'
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const numberFormat = new Intl.NumberFormat('es-AR')
export const fmtNum = (n: number) => numberFormat.format(n)
export const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
export const fmtDayLong = (d: string) => {
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
  return `${WEEKDAYS[dow]} ${fmtDay(d)}/${d.slice(0, 4)}`
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

// Ticks enteros "redondos" (1, 2, 5 × 10^k) para conteos.
function yTicks(max: number): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4]
  const raw = max / 4
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / pow
  const step = Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return ticks
}

// Rectángulo con el extremo de datos redondeado (arriba) y la base recta.
function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h)
  if (rr <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mx-legend">
      {series.map((s) => (
        <li key={s.key}>
          <span className="mx-swatch" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartCard({ title, subtitle, legend, table, children }: {
  title: string
  subtitle?: string
  legend?: ReactNode
  table?: ReactNode
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className="mx-card">
      <div className="mx-card-head">
        <div>
          <h3 className="mx-card-title">{title}</h3>
          {subtitle && <p className="mx-card-sub">{subtitle}</p>}
        </div>
        {table && (
          <button className="mx-link" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </div>
      {!showTable && legend}
      {showTable ? <div className="mx-table-wrap">{table}</div> : children}
    </section>
  )
}

const M = { top: 12, right: 8, bottom: 28, left: 40 }

export function StackedColumns({ days, series, getValue, label, emptyText, height = 240 }: {
  days: string[]
  series: Series[]
  getValue: (day: string, key: string) => number
  label: string
  emptyText: string
  height?: number
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const totals = days.map((d) => series.reduce((sum, s) => sum + getValue(d, s.key), 0))
  const max = Math.max(0, ...totals)
  const ticks = yTicks(max)
  const top = ticks[ticks.length - 1]
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const n = days.length
  const band = n ? plotW / n : 0
  const barW = Math.max(1, Math.min(24, band * 0.72))
  const labelEvery = Math.max(1, Math.ceil(46 / Math.max(band, 1)))
  const y = (v: number) => M.top + plotH - (v / top) * plotH

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const step = e.key === 'ArrowRight' ? 1 : -1
    setHover((h) => Math.min(n - 1, Math.max(0, (h ?? (step > 0 ? -1 : n)) + step)))
  }

  // Tooltip al costado de la columna (derecha, o izquierda si no entra) para no taparla.
  const TIP_W = 180
  const colRight = hover === null ? 0 : M.left + band * (hover + 1) + 8
  const tipOnLeft = colRight + TIP_W > width
  const tipX = hover === null ? 0 : tipOnLeft ? M.left + band * hover - 8 : colRight

  return (
    <div className="mx-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. Usá las flechas izquierda y derecha para recorrer los días.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)}
                stroke={t === 0 ? AXIS : GRID} strokeWidth={1} shapeRendering="crispEdges"
              />
              <text className="mx-axis-text" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtNum(t)}
              </text>
            </g>
          ))}

          {hover !== null && (
            <rect x={M.left + band * hover} y={M.top} width={band} height={plotH} fill={HOVER_WASH} />
          )}

          {days.map((d, i) => {
            const x = M.left + band * i + (band - barW) / 2
            const values = series.map((s) => getValue(d, s.key))
            let lastIdx = -1
            values.forEach((v, k) => { if (v > 0) lastIdx = k })
            let cum = 0
            return (
              <g key={d}>
                {series.map((s, k) => {
                  const v = values[k]
                  if (!v) return null
                  const y0 = y(cum)
                  const y1 = y(cum + v)
                  cum += v
                  const isTop = k === lastIdx
                  let yTop = y1
                  let h = y0 - y1
                  // Separación de 2px en el color de fondo entre segmentos apilados.
                  if (!isTop && h > 3) { yTop += 2; h -= 2 }
                  return isTop
                    ? <path key={s.key} d={topRoundedRect(x, yTop, barW, h, 4)} fill={s.color} />
                    : <rect key={s.key} x={x} y={yTop} width={barW} height={h} fill={s.color} />
                })}
              </g>
            )
          })}

          {days.map((d, i) => (i % labelEvery === 0 || n <= 7) && (
            <text
              key={d} className="mx-axis-text"
              x={M.left + band * (i + 0.5)} y={height - 8} textAnchor="middle"
            >
              {fmtDay(d)}
            </text>
          ))}

          {days.map((d, i) => (
            <rect
              key={d}
              x={M.left + band * i} y={M.top} width={band} height={plotH}
              fill="transparent"
              onPointerMove={() => setHover(i)}
            />
          ))}
        </svg>
      )}

      {width > 0 && max === 0 && <div className="mx-empty"><span>{emptyText}</span></div>}

      {hover !== null && days[hover] && (
        <div className="mx-tip" style={{ left: tipX, transform: tipOnLeft ? 'translateX(-100%)' : 'none' }}>
          <div className="mx-tip-title">{fmtDayLong(days[hover])}</div>
          {[...series].reverse().map((s) => (
            <div className="mx-tip-row" key={s.key}>
              <span className="mx-key" style={{ background: s.color }} />
              <strong>{fmtNum(getValue(days[hover], s.key))}</strong>
              <span>{s.label}</span>
            </div>
          ))}
          <div className="mx-tip-total">
            <span>Total</span>
            <strong>{fmtNum(totals[hover])}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export function HBars({ items, color, emptyText }: {
  items: { label: string; value: number }[]
  color: string
  emptyText: string
}) {
  const max = Math.max(0, ...items.map((i) => i.value))
  if (items.length === 0 || max === 0) return <p className="mx-empty-inline">{emptyText}</p>
  return (
    <ul className="mx-hbars">
      {items.map((it) => (
        <li key={it.label} className="mx-hbar">
          <span className="mx-hbar-label" title={it.label}>{it.label}</span>
          <div className="mx-hbar-row">
            <div
              className="mx-hbar-fill"
              style={{ width: `calc((100% - 64px) * ${it.value / max})`, background: color, minWidth: it.value > 0 ? 2 : 0 }}
            />
            <span className="mx-hbar-value">{fmtNum(it.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function PartBar({ parts, emptyText }: {
  parts: { key: string; label: string; value: number; color: string }[]
  emptyText: string
}) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total === 0) return <p className="mx-empty-inline">{emptyText}</p>
  const visible = parts.filter((p) => p.value > 0)
  return (
    <>
      <div className="mx-part" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {visible.map((p, i) => (
          <div
            key={p.key}
            className="mx-part-seg"
            title={`${p.label}: ${fmtNum(p.value)}`}
            style={{
              flexGrow: p.value,
              background: p.color,
              borderRadius: i === visible.length - 1 ? '0 4px 4px 0' : 0,
            }}
          />
        ))}
      </div>
      <ul className="mx-part-labels">
        {parts.map((p) => (
          <li key={p.key}>
            <span className="mx-swatch" style={{ background: p.color }} />
            {p.label} <strong>{fmtNum(p.value)}</strong> ({Math.round((p.value / total) * 100)} %)
          </li>
        ))}
      </ul>
    </>
  )
}

export function Meter({ ratio, color, track }: { ratio: number; color: string; track: string }) {
  return (
    <div className="mx-meter" style={{ background: track }}>
      <div style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%`, background: color }} />
    </div>
  )
}

export interface Delta {
  text: string
  dir: 'up' | 'down' | 'flat'
  tone: 'good' | 'bad' | 'neutral'
}

export function StatTile({ label, value, note, delta, status }: {
  label: string
  value: string
  note?: string
  delta?: Delta | null
  status?: ReactNode
}) {
  const arrow = delta ? (delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '=') : ''
  return (
    <div className="mx-tile">
      <div className="mx-tile-label">{label}</div>
      <div className="mx-tile-value">{value}</div>
      {status}
      {note && <div className="mx-tile-note">{note}</div>}
      {delta && (
        <div className={`mx-delta mx-delta-${delta.tone}`}>
          {arrow} {delta.text} <span className="mx-delta-ref">vs. período anterior</span>
        </div>
      )}
    </div>
  )
}
