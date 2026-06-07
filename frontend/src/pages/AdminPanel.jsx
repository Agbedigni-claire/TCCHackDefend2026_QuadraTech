import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'admin',        label: 'Administrateur' },
  { value: 'agent',        label: 'Agent' },
  { value: 'proprietaire', label: 'Propriétaire' },
]

export default function AdminPanel() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('users')

  // ── Liste utilisateurs ──────────────────────────────
  const [users,    setUsers]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [saving,   setSaving]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error,    setError]   = useState(null)
  const [success,  setSuccess] = useState(null)

  // ── Formulaire création ─────────────────────────────
  const [form,        setForm]        = useState({ username: '', email: '', password: '', role: 'agent' })
  const [formError,   setFormError]   = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  const [creating,    setCreating]    = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/api/users/utilisateurs/')
      setUsers(data.results ?? data)
    } catch {
      setError('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleChange(userId, field, value) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u))
  }

  async function handleSave(u) {
    setSaving(u.id)
    setError(null)
    setSuccess(null)
    try {
      await api.patch(`/api/users/utilisateurs/${u.id}/`, {
        role: u.role, email: u.email, is_active: u.is_active,
      })
      setSuccess(`Compte "${u.username}" mis à jour.`)
      load()
    } catch (err) {
      const d = err.response?.data
      setError(d?.detail || JSON.stringify(d) || 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Supprimer le compte "${u.username}" ? Cette action est irréversible.`)) return
    setDeleting(u.id)
    setError(null)
    setSuccess(null)
    try {
      await api.delete(`/api/users/utilisateurs/${u.id}/`)
      setSuccess(`Compte "${u.username}" supprimé.`)
      load()
    } catch (err) {
      const d = err.response?.data
      setError(d?.detail || 'Erreur lors de la suppression.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setFormError(null)
    setFormSuccess(null)
    try {
      await api.post('/api/users/utilisateurs/', form)
      setFormSuccess(`Compte "${form.username}" créé avec succès.`)
      setForm({ username: '', email: '', password: '', role: 'agent' })
      load()
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const msgs = Object.entries(d).map(([k, v]) => `${k} : ${[v].flat().join(', ')}`).join(' — ')
        setFormError(msgs)
      } else {
        setFormError('Erreur lors de la création.')
      }
    } finally {
      setCreating(false)
    }
  }

  if (me?.role !== 'admin') {
    return <div className="page"><p className="text-muted">Accès réservé aux administrateurs.</p></div>
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const agentCount = users.filter(u => u.role === 'agent').length
  const propCount  = users.filter(u => u.role === 'proprietaire').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Espace administrateur</h2>
          <span className="text-muted" style={{ fontSize: '.82rem', marginTop: '.2rem', display: 'block' }}>
            {users.length} compte(s) —{' '}
            <span className="badge badge-role badge-admin">{adminCount} admin</span>{' '}
            <span className="badge badge-role badge-agent">{agentCount} agent(s)</span>{' '}
            <span className="badge badge-role badge-proprietaire">{propCount} propriétaire(s)</span>
          </span>
        </div>
      </div>

      <div className="td-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`td-tab ${tab === 'users' ? 'td-tab-active' : ''}`}
          onClick={() => setTab('users')}
        >
          Utilisateurs
        </button>
        <button
          className={`td-tab ${tab === 'create' ? 'td-tab-active' : ''}`}
          onClick={() => setTab('create')}
        >
          Nouveau compte
        </button>
      </div>

      {/* ── Onglet liste ───────────────────────────────── */}
      {tab === 'users' && (
        <>
          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {loading ? (
            <p className="text-muted">Chargement…</p>
          ) : users.length === 0 ? (
            <p className="text-muted">Aucun compte trouvé.</p>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Actif</th>
                    <th>Inscrit le</th>
                    <th>Actions</th>
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
                            <div>
                              <span>{u.username}</span>
                              {isMe && <span className="gu-me-badge"> (moi)</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '.85rem' }}>{u.email || '—'}</td>
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
                            <div style={{ display: 'flex', gap: '.4rem' }}>
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={saving === u.id}
                                onClick={() => handleSave(u)}
                              >
                                {saving === u.id ? '…' : 'Enregistrer'}
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                                disabled={deleting === u.id}
                                onClick={() => handleDelete(u)}
                              >
                                {deleting === u.id ? '…' : 'Supprimer'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Onglet création ────────────────────────────── */}
      {tab === 'create' && (
        <div className="card form-card" style={{ maxWidth: 520 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Créer un nouveau compte
          </h3>

          {formError   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{formError}</div>}
          {formSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{formSuccess}</div>}

          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nom d'utilisateur</label>
                <input
                  className="form-control"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select
                  className="form-control"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group col-2" style={{ marginTop: '.5rem' }}>
                <button className="btn btn-primary w-full" disabled={creating}>
                  {creating ? 'Création en cours…' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
