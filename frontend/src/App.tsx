import ExcelGenerator from './components/ExcelGenerator'
import DeudasView from './components/DeudasView'
import './App.css'

type Tab = 'envios' | 'deudas'

function App() {
  const [tab, setTab] = useState<Tab>('envios')

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
            💰 Deudas
          </button>
        </div>

        {tab === 'envios' ? <ExcelGenerator /> : <DeudasView />}
      </div>
    </div>
  )
}

export default App
