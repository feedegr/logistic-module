import { useMemo, useState } from 'react'
import './DeudasView.css'

interface ClienteDeuda {
  codCliente: string | null
  razonSocial: string
  telefono: string
  cantidadComprobantes: number
  deudaTotal: number
}

function toInputDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function toApiDate(inputDate: string): string {
  const [year, month, day] = inputDate.split('-')
  return `${day}/${month}/${year}`
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export default function DeudasView() {
  const today = new Date()
  const nextYear = new Date(today)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  const [fromDate, setFromDate] = useState('2026-01-01')
  const [toDate, setToDate] = useState(toInputDate(nextYear))
  const [search, setSearch] = useState('')
  const [deudas, setDeudas] = useState<ClienteDeuda[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleBuscar = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: toApiDate(fromDate),
          toDate: toApiDate(toDate),
        }),
      })

      if (!response.ok) {
        throw new Error('Error consultando deudas')
      }

      const data = await response.json()
      setDeudas(data.deudas)
      setHasSearched(true)
    } catch (err) {
      console.error('Error obteniendo deudas:', err)
      setError('No se pudo obtener la información de deudas')
    } finally {
      setLoading(false)
    }
  }

  const handleVencidasHastaHoy = () => {
    setToDate(toInputDate(today))
  }

  const deudasFiltradas = useMemo(() => {
    const query = search.trim().toUpperCase()
    if (!query) return deudas
    return deudas.filter((d) => (d.codCliente ?? '').toUpperCase().includes(query))
  }, [deudas, search])

  return (
    <div className="shipments-container">
      <div className="header">
        <div className="header-content">
          <h1 className="title">💰 Deudas</h1>
          <p className="subtitle">Consultá comprobantes pendientes de cobro por cliente</p>
        </div>
      </div>

      <div className="section">
        <div className="deudas-filters">
          <div className="deudas-filter-field">
            <label htmlFor="fromDate">Desde</label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="deudas-filter-field">
            <label htmlFor="toDate">Hasta</label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleBuscar} disabled={loading}>
            {loading ? 'BUSCANDO...' : '🔍 BUSCAR'}
          </button>
          <button className="btn btn-download" onClick={handleVencidasHastaHoy} disabled={loading}>
            ⏰ VENCIDAS HASTA HOY
          </button>
        </div>

        {error && <p className="deudas-error">{error}</p>}

        {hasSearched && !error && (
          <>
            <div className="deudas-search">
              <input
                type="text"
                placeholder="Buscar por código de cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="table-wrapper">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>COD. CLIENTE</th>
                    <th>RAZÓN SOCIAL</th>
                    <th>TELÉFONO</th>
                    <th>CANT. COMPROBANTES</th>
                    <th>DEUDA TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {deudasFiltradas.map((d, i) => (
                    <tr key={i}>
                      <td>{d.codCliente ?? '—'}</td>
                      <td>{d.razonSocial}</td>
                      <td>{d.telefono || '—'}</td>
                      <td>{d.cantidadComprobantes}</td>
                      <td className="deudas-total">{currencyFormatter.format(d.deudaTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="footer">
        <p><strong>Tip:</strong> el rango de fechas filtra por fecha de vencimiento del comprobante.</p>
      </div>
    </div>
  )
}
