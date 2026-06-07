import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'admin',        label: 'Administrateur' },
  { value: 'agent',        label: 'Agent' },
  { value: 'proprietaire', label: 'Propriétaire' },
]

export default function GestionUtilisateurs() {
  const { user: me } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)   // id en cours de sauvegarde
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  async function load() {
    try {
      const { data } = await api.get('/api/users/utilisateurs/')
      setUsers(data)
    } catch {
      setError('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleChange(userId, field, value) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u))
  }

  async function handleSave(u) {
    setSaving(u.id)
    setError(null)
    setSuccess(null)
    try {
      await api.patch(`/api/users/utilisateurs/${u.id}/`, {
        role:      u.role,
        email:     u.email,
        is_active: u.is_active,
      })
      setSuccess(`Utilisateur "${u.username}" mis à jour.`)
      load()
    } catch (err) {
      const d = err.response?.data
      setError(d?.detail || JSON.stringify(d) || 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(null)
    }
  }

  if (me?.role !== 'admin') {
    return (
      <div className="page">
        <p className="text-muted">Accès réservé aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Gestion des utilisateurs</h2>
        <span className="text-muted" style={{ fontSize: '.85rem' }}>{users.length} compte(s)</span>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Actif</th>
                <th>Inscrit le</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id} className={isMe ? 'gu-row-me' : ''}>
                    <td>
                      <div className="gu-user-cell">
                        <span className="gu-avatar">{u.username.charAt(0).toUpperCase()}</span>
                        <span>{u.username}{isMe && <span className="gu-me-badge"> (moi)</span>}</span>
                      </div>
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={u.role}
                        disabled={isMe}
                        onChange={e => handleChange(u.id, 'role', e.target.value)}
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={u.is_active}
                        disabled={isMe}
                        onChange={e => handleChange(u.id, 'is_active', e.target.checked)}
                        className="gu-checkbox"
                      />
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
                      {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      {isMe ? (
                        <span className="text-muted" style={{ fontSize: '.8rem' }}>—</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={saving === u.id}
                          onClick={() => handleSave(u)}
                        >
                          {saving === u.id ? '…' : 'Enregistrer'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
