import { useState } from 'react'
import ExcelGenerator from './components/ExcelGenerator'
import DeudasView from './components/DeudasView'
import ClientesView from './components/ClientesView'
import HealthStatus from './components/HealthStatus'
import LoginView from './components/LoginView'
import { clearToken, getToken } from './api'
import './App.css'

type Tab = 'envios' | 'deudas' | 'clientes'

function App() {
  const [tab, setTab] = useState<Tab>('clientes')
  const [authed, setAuthed] = useState(() => Boolean(getToken()))

  if (!authed) {
    return <LoginView onLogin={() => setAuthed(true)} />
  }

  const handleLogout = () => {
    clearToken()
    setAuthed(false)
  }

  return (
    <div className="app">
      <div className="app-content">
        <div className="tabs">
          <button
            className={`tab ${tab === 'envios' ? 'tab-active' : ''}`}
            onClick={() => setTab('envios')}
          >
            📦 Envíos
          </button>
          <button
            className={`tab ${tab === 'deudas' ? 'tab-active' : ''}`}
            onClick={() => setTab('deudas')}
          >
            💰 Cobranzas
          </button>
          <button
            className={`tab ${tab === 'clientes' ? 'tab-active' : ''}`}
            onClick={() => setTab('clientes')}
          >
            👥 Clientes
          </button>
          <div className="tabs-spacer" />
          <HealthStatus />
          <button className="tab tab-logout" onClick={handleLogout}>
            🚪 Salir
          </button>
        </div>

        {tab === 'envios' && <ExcelGenerator />}
        {tab === 'deudas' && <DeudasView />}
        {tab === 'clientes' && <ClientesView />}
      </div>
    </div>
  )
}

export default App
