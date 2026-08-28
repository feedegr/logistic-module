import { useEffect, useMemo, useState } from 'react'
import './ClientesView.css'

interface Contact {
  id: number
  tangoId: string
  tangoInternalId: number | null
  name: string
  phoneNormalized: string
  email: string | null
  cuit: string | null
  ivaCategory: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  provinceCode: string | null
  deliveryZone: string | null
  sellerCode: string | null
  priceListNumber: string | null
  deliversMonday: boolean
  deliversTuesday: boolean
  deliversWednesday: boolean
  deliversThursday: boolean
  deliversFriday: boolean
  deliversSaturday: boolean
  deliversSunday: boolean
  chatwootContactId: number | null
  optOut: boolean
  noResponseStreak: number
  syncedAt: string
}

const DAYS: { key: keyof Contact; label: string }[] = [
  { key: 'deliversMonday', label: 'L' },
  { key: 'deliversTuesday', label: 'M' },
  { key: 'deliversWednesday', label: 'X' },
  { key: 'deliversThursday', label: 'J' },
  { key: 'deliversFriday', label: 'V' },
  { key: 'deliversSaturday', label: 'S' },
  { key: 'deliversSunday', label: 'D' },
]

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export default function ClientesView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const cargarClientes = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/contacts')
      if (!response.ok) {
        throw new Error('Error consultando clientes')
      }
      const data = await response.json()
      setContacts(data.contacts)
    } catch (err) {
      console.error('Error obteniendo clientes:', err)
      setError('No se pudo obtener la información de clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const contactsFiltrados = useMemo(() => {
    const query = search.trim().toUpperCase()
    if (!query) return contacts
    return contacts.filter((c) =>
      [
        c.name,
        c.phoneNormalized,
        c.tangoId,
        c.sellerCode ?? '',
        c.provinceCode ?? '',
        c.deliveryZone ?? '',
        c.email ?? '',
        c.cuit ?? '',
        c.city ?? '',
      ]
        .join(' ')
        .toUpperCase()
        .includes(query),
    )
  }, [contacts, search])

  return (
    <div className="shipments-container">
      <div className="header">
        <div className="header-content">
          <h1 className="title">👥 Clientes</h1>
          <p className="subtitle">Contactos sincronizados desde Tango en la base de oasisbot</p>
        </div>
      </div>

      <div className="section">
        <div className="clientes-toolbar">
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email, CUIT, vendedor, zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={cargarClientes} disabled={loading}>
            {loading ? 'CARGANDO...' : '🔄 ACTUALIZAR'}
          </button>
        </div>

        {error && <p className="clientes-error">{error}</p>}

        {!error && (
          <>
            <p className="clientes-count">
              {contactsFiltrados.length} de {contacts.length} clientes
            </p>

            <div className="table-wrapper">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>NOMBRE</th>
                    <th>TELÉFONO</th>
                    <th>EMAIL</th>
                    <th>CUIT</th>
                    <th>CAT. IVA</th>
                    <th>DIRECCIÓN</th>
                    <th>CIUDAD</th>
                    <th>C.P.</th>
                    <th>PROVINCIA</th>
                    <th>ZONA DE ENTREGA</th>
                    <th>COD. TANGO</th>
                    <th>ID INTERNO TANGO</th>
                    <th>VENDEDOR</th>
                    <th>LISTA DE PRECIO</th>
                    <th>DÍAS DE ENTREGA</th>
                    <th>CHATWOOT ID</th>
                    <th>OPT-OUT</th>
                    <th>SIN RESPUESTA</th>
                    <th>SINCRONIZADO</th>
                  </tr>
                </thead>
                <tbody>
                  {contactsFiltrados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.phoneNormalized}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.cuit ?? '—'}</td>
                      <td>{c.ivaCategory ?? '—'}</td>
                      <td>{c.address ?? '—'}</td>
                      <td>{c.city ?? '—'}</td>
                      <td>{c.postalCode ?? '—'}</td>
                      <td>{c.provinceCode ?? '—'}</td>
                      <td>{c.deliveryZone ?? '—'}</td>
                      <td>{c.tangoId}</td>
                      <td>{c.tangoInternalId ?? '—'}</td>
                      <td>{c.sellerCode ?? '—'}</td>
                      <td>{c.priceListNumber ?? '—'}</td>
                      <td>
                        <div className="clientes-days">
                          {DAYS.map((d) => (
                            <span
                              key={d.key}
                              className={`clientes-day ${c[d.key] ? 'clientes-day-active' : ''}`}
                            >
                              {d.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{c.chatwootContactId ?? '—'}</td>
                      <td>{c.optOut ? 'Sí' : 'No'}</td>
                      <td>{c.noResponseStreak}</td>
                      <td>{dateFormatter.format(new Date(c.syncedAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
