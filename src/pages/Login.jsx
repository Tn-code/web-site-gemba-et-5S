import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="WKW" style={{ width: '80px', marginBottom: '1rem' }} />
          <h2 style={{ margin: 0 }}>Connexion Sécurisée</h2>
          <p className="muted" style={{ fontSize: '0.9rem' }}>Accès réservé aux auditeurs et managers.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adresse Email</label>
            <input 
              type="email" 
              placeholder="exemple@wkw.com" 
              className="filter-control" 
              style={{ width: '100%', marginTop: '0.25rem' }}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mot de passe</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="filter-control" 
              style={{ width: '100%', marginTop: '0.25rem' }}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              required
            />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{error}</p>}
          
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
