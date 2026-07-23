import { useState } from 'react'
import './ExcelGenerator.css'

function getNextBusinessDay(): Date {
  const today = new Date()
  const nextDay = new Date(today)
  nextDay.setDate(nextDay.getDate() + 1)

  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1)
  }

  return nextDay
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateLong(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  const monthName = months[date.getMonth()]
  const year = date.getFullYear()
  return `${dayName}, ${dayNum} de ${monthName} de ${year}`
}

export default function ExcelGenerator() {
  const [isGenerated, setIsGenerated] = useState(false)
  const [clientCount, setClientCount] = useState(0)
  const nextDay = getNextBusinessDay()

  const handleGenerate = async () => {
    try {
      const date = formatDate(nextDay)
      const response = await fetch('/api/excel/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      })

      if (response.ok) {
        const data = await response.json()
        setClientCount(data.clientCount)
        setIsGenerated(true)
      }
    } catch (error) {
      console.error('Error getting preview:', error)
      setIsGenerated(true)
    }
  }

  const handleDownload = async () => {
    try {
      const date = formatDate(nextDay)
      const response = await fetch('/api/excel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hierbas-${date.replace(/\//g, '-')}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error descargando excel:', error)
    }
  }

  return (
    <div className="shipments-container">
      <div className="header">
        <div className="header-content">
          <h1 className="title">🌿 Hierbas del Oasis</h1>
          <p className="subtitle">Gestiona las entregas de Hierbas del Oasis</p>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <span className="section-icon">📦</span>
            <h2>Próximo Envío</h2>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
          >
            ⚡ GENERAR ENVÍO MAÑANA
          </button>
        </div>

        {isGenerated && (
          <div className="table-wrapper">
            <table className="shipments-table">
              <thead>
                <tr>
                  <th>ZONA</th>
                  <th>FECHA DE ENTREGA</th>
                  <th>CLIENTES</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="zone-badge">HOJA DE RUTA CONSOLIDADA</span>
                  </td>
                  <td>{formatDateLong(nextDay)}</td>
                  <td>
                    <span className="invoice-count">{clientCount}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-download"
                      onClick={handleDownload}
                    >
                      📥 DESCARGAR
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="footer">
        <p><strong>Tip:</strong> Genera un envío para mañana. El sistema traerá todos los clientes de esa zona.</p>
      </div>
    </div>
  )
}
