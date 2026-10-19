import { useState } from 'react'
import Header from './components/Header'
import UploadCard from './components/UploadCard'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '1.5rem' }}>
        <UploadCard onImported={() => setRefreshKey(k => k + 1)} />
        <div style={{ height: '1.5rem' }} />
        <Dashboard refreshKey={refreshKey} />
      </main>
    </>
  )
}
