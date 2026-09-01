import { useEffect, useMemo, useState } from 'react'
import './ClientesView.css'

interface Contact {
  id: number
  tangoId: string
  name: string
  phoneNormalized: string
  address: string | null
  city: string | null
  priceListNumber: string | null
  deliversMonday: boolean
  deliversTuesday: boolean
  deliversWednesday: boolean
  deliversThursday: boolean
  deliversFriday: boolean
  deliversSaturday: boolean
  deliversSunday: boolean
}

interface EditState {
  name: string
  address: string
  city: string
  priceListNumber: string
  deliversMonday: boolean
  deliversTuesday: boolean
  deliversWednesday: boolean
  deliversThursday: boolean
  deliversFriday: boolean
  deliversSaturday: boolean
  deliversSunday: boolean
}

const DAYS: { key: keyof EditState; label: string }[] = [
  { key: 'deliversMonday', label: 'L' },
  { key: 'deliversTuesday', label: 'M' },
  { key: 'deliversWednesday', label: 'X' },
  { key: 'deliversThursday', label: 'J' },
  { key: 'deliversFriday', label: 'V' },
  { key: 'deliversSaturday', label: 'S' },
  { key: 'deliversSunday', label: 'D' },
]

const PRICE_LIST_OPTIONS = [
  { value: '', label: '—' },
  { value: '100', label: 'C' },
  { value: '300', label: 'D' },
  { value: '400', label: 'D+' },
]

function priceLabel(pl: string | null) {
  if (!pl) return '—'
  if (pl === '100' || pl === '101') return 'C'
  if (pl === '300' || pl === '301') return 'D'
  if (pl === '400' || pl === '401') return 'D+'
  return pl
}

function toEditState(c: Contact): EditState {
  let pl = c.priceListNumber ?? ''
  if (pl === '101') pl = '100'
  if (pl === '301') pl = '300'
  if (pl === '401') pl = '400'
  return {
    name: c.name,
    address: c.address ?? '',
    city: c.city ?? '',
    priceListNumber: pl,
    deliversMonday: c.deliversMonday,
    deliversTuesday: c.deliversTuesday,
    deliversWednesday: c.deliversWednesday,
    deliversThursday: c.deliversThursday,
    deliversFriday: c.deliversFriday,
    deliversSaturday: c.deliversSaturday,
    deliversSunday: c.deliversSunday,
  }
}

const EMPTY_NEW = {
  tangoId: '',
  name: '',
  phoneNormalized: '',
  address: '',
  city: '',
  priceListNumber: '',
  deliversMonday: false,
  deliversTuesday: false,
  deliversWednesday: false,
  deliversThursday: false,
  deliversFriday: false,
  deliversSaturday: false,
  deliversSunday: false,
}

export default function ClientesView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newContact, setNewContact] = useState({ ...EMPTY_NEW })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const cargarClientes = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setContacts(data.contacts)
    } catch {
      setError('No se pudo obtener la información de clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarClientes() }, [])

  const contactsFiltrados = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return contacts
    return contacts.filter((c) =>
      [c.name, c.tangoId, c.phoneNormalized, c.address ?? '', c.city ?? ''].join(' ').toUpperCase().includes(q)
    )
  }, [contacts, search])

  const startEdit = (c: Contact) => {
    setEditingId(c.id)
    setEditState(toEditState(c))
    setSaveError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditState(null)
    setSaveError('')
  }

  const toggleDay = (key: keyof EditState) => {
    if (!editState) return
    setEditState({ ...editState, [key]: !editState[key as keyof EditState] })
  }

  const saveEdit = async () => {
    if (!editState || editingId == null) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name || undefined,
          address: editState.address || null,
          city: editState.city || null,
          priceListNumber: editState.priceListNumber || null,
          deliversMonday: editState.deliversMonday,
          deliversTuesday: editState.deliversTuesday,
          deliversWednesday: editState.deliversWednesday,
          deliversThursday: editState.deliversThursday,
          deliversFriday: editState.deliversFriday,
          deliversSaturday: editState.deliversSaturday,
          deliversSunday: editState.deliversSunday,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const { contact } = await res.json()
      setContacts((prev) => prev.map((c) => (c.id === editingId ? contact : c)))
      cancelEdit()
    } catch (err: any) {
      setSaveError(err.message ?? 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  const toggleNewDay = (key: keyof typeof EMPTY_NEW) => {
    setNewContact((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const submitNew = async () => {
    if (!newContact.tangoId || !newContact.name || !newContact.phoneNormalized) {
      setCreateError('Código Tango, razón social y teléfono son obligatorios')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContact,
          address: newContact.address || null,
          city: newContact.city || null,
          priceListNumber: newContact.priceListNumber || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const { contact } = await res.json()
      setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
      setNewContact({ ...EMPTY_NEW })
    } catch (err: any) {
      setCreateError(err.message ?? 'Error creando cliente')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="shipments-container">
      <div className="header">
        <div className="header-content">
          <h1 className="title">👥 Clientes</h1>
          <p className="subtitle">Contactos sincronizados desde Tango</p>
        </div>
      </div>

      <div className="section">
        <div className="clientes-toolbar">
          <input
            type="text"
            placeholder="Buscar por razón social, código, dirección, ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={cargarClientes} disabled={loading}>
            {loading ? 'CARGANDO...' : '🔄 ACTUALIZAR'}
          </button>
          <button className="btn btn-add" onClick={() => { setShowModal(true); setCreateError('') }}>
            + NUEVO CLIENTE
          </button>
        </div>

        {error && <p className="clientes-error">{error}</p>}

        {!error && (
          <>
            <p className="clientes-count">{contactsFiltrados.length} de {contacts.length} clientes</p>

            <div className="table-wrapper">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>RAZÓN SOCIAL</th>
                    <th>CÓDIGO</th>
                    <th>TELÉFONO</th>
                    <th>DIRECCIÓN</th>
                    <th>CIUDAD</th>
                    <th>LISTA</th>
                    <th>DÍAS DE ENTREGA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contactsFiltrados.map((c) => {
                    const isEditing = editingId === c.id
                    return (
                      <tr key={c.id} className={isEditing ? 'clientes-row-editing' : ''}>
                        <td>
                          {isEditing
                            ? <input className="clientes-input" value={editState!.name} onChange={(e) => setEditState({ ...editState!, name: e.target.value })} />
                            : c.name}
                        </td>
                        <td className="clientes-code">{c.tangoId}</td>
                        <td>{c.phoneNormalized || '—'}</td>
                        <td>
                          {isEditing
                            ? <input className="clientes-input" value={editState!.address} onChange={(e) => setEditState({ ...editState!, address: e.target.value })} />
                            : (c.address ?? '—')}
                        </td>
                        <td>
                          {isEditing
                            ? <input className="clientes-input clientes-input-sm" value={editState!.city} onChange={(e) => setEditState({ ...editState!, city: e.target.value })} />
                            : (c.city ?? '—')}
                        </td>
                        <td>
                          {isEditing
                            ? (
                              <select className="clientes-select" value={editState!.priceListNumber} onChange={(e) => setEditState({ ...editState!, priceListNumber: e.target.value })}>
                                {PRICE_LIST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            )
                            : <span className={`clientes-badge ${c.priceListNumber ? 'clientes-badge-active' : ''}`}>{priceLabel(c.priceListNumber)}</span>}
                        </td>
                        <td>
                          <div className="clientes-days">
                            {DAYS.map((d) => {
                              const active = isEditing ? editState![d.key] as boolean : c[d.key as keyof Contact] as boolean
                              return (
                                <span
                                  key={d.key}
                                  className={`clientes-day ${active ? 'clientes-day-active' : ''} ${isEditing ? 'clientes-day-clickable' : ''}`}
                                  onClick={isEditing ? () => toggleDay(d.key) : undefined}
                                >
                                  {d.label}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="clientes-actions">
                          {isEditing ? (
                            <div className="clientes-action-group">
                              {saveError && <span className="clientes-save-error">{saveError}</span>}
                              <button className="btn btn-save" onClick={saveEdit} disabled={saving}>{saving ? '...' : '✓ GUARDAR'}</button>
                              <button className="btn btn-cancel" onClick={cancelEdit} disabled={saving}>CANCELAR</button>
                            </div>
                          ) : (
                            <button className="btn btn-edit" onClick={() => startEdit(c)}>✏️ EDITAR</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="clientes-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="clientes-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="clientes-modal-title">Nuevo cliente</h2>

            <div className="clientes-modal-fields">
              <label>Código Tango *
                <input className="clientes-input" placeholder="Ej: CDN999" value={newContact.tangoId} onChange={(e) => setNewContact({ ...newContact, tangoId: e.target.value })} />
              </label>
              <label>Razón social *
                <input className="clientes-input" placeholder="Nombre del cliente" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              </label>
              <label>Teléfono *
                <input className="clientes-input" placeholder="5491112345678" value={newContact.phoneNormalized} onChange={(e) => setNewContact({ ...newContact, phoneNormalized: e.target.value })} />
              </label>
              <label>Dirección
                <input className="clientes-input" placeholder="Ej: Av. Corrientes 1234" value={newContact.address} onChange={(e) => setNewContact({ ...newContact, address: e.target.value })} />
              </label>
              <label>Ciudad
                <input className="clientes-input" placeholder="Ej: Buenos Aires" value={newContact.city} onChange={(e) => setNewContact({ ...newContact, city: e.target.value })} />
              </label>
              <label>Lista de precios
                <select className="clientes-select" value={newContact.priceListNumber} onChange={(e) => setNewContact({ ...newContact, priceListNumber: e.target.value })}>
                  {PRICE_LIST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label>Días de entrega
                <div className="clientes-days clientes-days-modal">
                  {DAYS.map((d) => (
                    <span
                      key={d.key}
                      className={`clientes-day clientes-day-clickable ${newContact[d.key as keyof typeof newContact] ? 'clientes-day-active' : ''}`}
                      onClick={() => toggleNewDay(d.key as keyof typeof EMPTY_NEW)}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
              </label>
            </div>

            {createError && <p className="clientes-save-error">{createError}</p>}

            <div className="clientes-modal-actions">
              <button className="btn btn-save" onClick={submitNew} disabled={creating}>
                {creating ? 'GUARDANDO...' : '✓ CREAR CLIENTE'}
              </button>
              <button className="btn btn-cancel" onClick={() => setShowModal(false)} disabled={creating}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
