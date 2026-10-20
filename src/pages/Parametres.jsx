import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Parametres() {
  const [users, setUsers] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('email')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: 'Création en cours...' })

    const { error } = await supabase.rpc('create_new_user', {
      user_email: email,
      user_password: password,
      user_role: role
    })

    if (error) {
      setMessage({ type: 'error', text: 'Erreur : ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Utilisateur créé avec succès !' })
      setEmail('')
      setPassword('')
      loadUsers()
    }
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Paramètres & Utilisateurs</h1>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">Créer un nouvel utilisateur</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adresse Email</label>
              <input type="email" className="filter-control" style={{ width: '100%', marginTop: '0.25rem' }} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mot de passe temporaire</label>
              <input type="text" className="filter-control" style={{ width: '100%', marginTop: '0.25rem' }} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rôle</label>
              <select className="filter-control" style={{ width: '100%', marginTop: '0.25rem' }} value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">Pilote / Auditeur (User)</option>
                <option value="admin">Administrateur (Admin)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Créer l'utilisateur</button>
          </form>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Utilisateurs ({users.length})</h2>
          </div>
          <div className="table-wrapper" style={{ maxHeight: '400px', border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'ok' : ''}`} style={{ background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-main)', color: u.role === 'admin' ? '#3b82f6' : 'var(--text-main)' }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
