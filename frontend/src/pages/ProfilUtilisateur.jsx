import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  admin:        'Administrateur',
  agent:        'Agent',
  proprietaire: 'Propriétaire',
}

export default function ProfilUtilisateur() {
  const { user, logout } = useAuth()

  const [pwForm,    setPwForm]    = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(null)
  const [pwError,   setPwError]   = useState(null)
  const [showPw,    setShowPw]    = useState(false)

  function setPw(field) {
    return e => setPwForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwSuccess(null)
    setPwError(null)
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    setPwLoading(true)
    try {
      const { data } = await api.post('/api/users/changer-mot-de-passe/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
      setPwSuccess(data.detail)
      setPwForm({ old_password: '', new_password: '', confirm: '' })
      setShowPw(false)
    } catch (err) {
      const d = err.response?.data
      if (d?.old_password) setPwError(d.old_password)
      else if (d?.new_password) setPwError(Array.isArray(d.new_password) ? d.new_password.join(' ') : d.new_password)
      else setPwError('Une erreur est survenue.')
    } finally {
      setPwLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="page">
      <div className="page-header">
        <h2>Mon profil</h2>
      </div>

      <div className="profil-layout">
        {/* Carte compte */}
        <div className="card profil-card">
          <div className="profil-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h3 className="profil-username">{user.username}</h3>
          <span className={`badge badge-role badge-${user.role}`} style={{ fontSize: '.85rem' }}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>

          <dl className="profil-dl">
            <dt>Email</dt>
            <dd>{user.email || '—'}</dd>
            <dt>Membre depuis</dt>
            <dd>{user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR') : '—'}</dd>
            <dt>Statut</dt>
            <dd>{user.is_active ? 'Actif' : 'Inactif'}</dd>
          </dl>
        </div>

        {/* Modifier le mot de passe */}
        <div className="card profil-pw-card">
          <h3>Sécurité</h3>

          {pwSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{pwSuccess}</div>
          )}

          {!showPw ? (
            <button className="btn btn-outline" onClick={() => setShowPw(true)}>
              Modifier le mot de passe
            </button>
          ) : (
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Mot de passe actuel</label>
                <input
                  type="password"
                  className="form-control"
                  value={pwForm.old_password}
                  onChange={setPw('old_password')}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-control"
                  value={pwForm.new_password}
                  onChange={setPw('new_password')}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-control"
                  value={pwForm.confirm}
                  onChange={setPw('confirm')}
                  required
                  autoComplete="new-password"
                />
              </div>
              {pwError && <div className="alert alert-error">{pwError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Enregistrement…' : 'Modifier'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowPw(false)}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
